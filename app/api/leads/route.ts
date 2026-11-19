import { NextResponse } from "next/server";
import { leadSchema, hashIp, clientIp } from "@/lib/leads";
import { insertLead, countRecentLeadsByIp, addSystemNote } from "@/lib/db";
import { notifySlack } from "@/lib/slack";
import { sendLeadEmails } from "@/lib/mail";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 5; // per IP per hour

/** POST /api/leads — validate → rate-limit → save → Slack ping → thank-you email. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    // zod issues → {field: message} for the form to show inline
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // honeypot: a filled trap field is only a *flag*, never a reason to drop the lead —
  // browser autofill (Edge, password managers) fills hidden fields and silently lost
  // real leads (19 Nov 2026). It passed validation, so save it and let a human judge.
  const trapped = !!parsed.data.website?.trim();

  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip);

  try {
    const recent = await countRecentLeadsByIp(ipHash);
    if (!process.env.RATE_LIMIT_DISABLED && recent >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { ok: false, error: "You've sent quite a few already — we'll be in touch very soon." },
        { status: 429 },
      );
    }

    const lead = await insertLead({ ...parsed.data, selfService: !!parsed.data.selfService, ipHash });
    if (parsed.data.selfService) void addSystemNote(lead.id, "Self-service request: they prefer no calls, everything in the portal. Accept = Make client (portal invite). Decline if it isn't a fit.").catch(() => {});

    // fire-and-forget: never blocks or fails the response
    void notifySlack(lead);
    // ledger baseline entry (Mira's lead-detail wireframe: muted SYS row)
    void addSystemNote(
      lead.id,
      "Lead captured via contact form. Slack notification delivered to #agent-org.",
    ).catch(() => {});
    if (trapped) {
      // possible bot: keep it, flag it, but don't auto-email an address a bot may have made up
      void addSystemNote(lead.id, "Spam-trap field was filled (often just browser autofill). Check before replying — no auto thank-you email was sent.").catch(() => {});
    } else {
      // thank-you email to the lead (+ optional alert to us); ledger gets a line per send
      void sendLeadEmails(lead)
        .then((notes) => Promise.all(notes.map((n) => addSystemNote(lead.id, n))))
        .catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      lead: { id: lead.id, createdAt: lead.created_at },
    });
  } catch (err) {
    console.error("[leads] save failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong on our side — please try again, or just call us." },
      { status: 500 },
    );
  }
}
