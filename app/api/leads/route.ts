import { NextResponse } from "next/server";
import { leadSchema, hashIp, clientIp } from "@/lib/leads";
import { insertLead, countRecentLeadsByIp } from "@/lib/db";
import { notifySlack } from "@/lib/slack";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 5; // per IP per hour

/** POST /api/leads — validate → rate-limit → save → Slack ping. */
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

  // honeypot: bots fill the hidden field — accept silently, save nothing
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, lead: "thanks" });
  }

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

    const lead = await insertLead({ ...parsed.data, ipHash });

    // fire-and-forget: never blocks or fails the response
    void notifySlack(lead);

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
