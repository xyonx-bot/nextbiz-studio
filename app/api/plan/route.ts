import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp, clientIp } from "@/lib/leads";
import { insertLead, countRecentLeadsByIp, addSystemNote } from "@/lib/db";
import { notifySlack } from "@/lib/slack";
import { sendLeadEmails } from "@/lib/mail";
import { getPricing } from "@/lib/planner";
import { SIZES, WHEN, buildPlan, planText } from "@/lib/planner-core";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  phone: z.string().trim().max(24).optional().or(z.literal("")).or(z.null()),
  email: z.string().trim().email("That email doesn't look right.").max(160).optional().or(z.literal("")).or(z.null()),
  website: z.string().optional().nullable(),          // honeypot
  answers: z.object({
    type: z.enum(["website", "store", "whatsapp", "instagram", "custom"]),
    industry: z.string().max(60).default(""),
    size: z.enum(SIZES.map((s) => s.id) as [string, ...string[]]).or(z.literal("")).default(""),
    features: z.array(z.string().max(20)).max(40).default([]),
    when: z.enum(WHEN.map((w) => w.id) as [string, ...string[]]).default("normal"),
    budget: z.string().max(20).default(""),
    scope: z.record(z.string().max(20), z.string().max(20)).optional(),
  }),
});
const SERVICE: Record<string, string> = { website: "A new website", store: "A new website", whatsapp: "WhatsApp / Meta solutions", instagram: "Marketing & social media", custom: "Not sure yet — help me shape it" };

/** POST /api/plan — a plan from /plan becomes a lead. The plan is rebuilt here from the admin's pricing. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 422 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true });
  const phone = (b.phone ?? "").trim(), email = (b.email ?? "").trim();
  if (phone.replace(/\D/g, "").length < 7 && !email.includes("@")) return NextResponse.json({ ok: false, error: "Leave a WhatsApp number or an email so we can reply." }, { status: 422 });

  const ipHash = hashIp(clientIp(req.headers));
  try {
    if (!process.env.RATE_LIMIT_DISABLED && (await countRecentLeadsByIp(ipHash)) >= 5)
      return NextResponse.json({ ok: false, error: "You've sent a few already — we'll be in touch very soon." }, { status: 429 });
    const pricing = await getPricing();
    const a = { ...b.answers, industry: b.answers.industry.slice(0, 60) };
    const plan = buildPlan(pricing, a);
    const lead = await insertLead({
      name: b.name, phone: phone || null, email: email || null, service: SERVICE[a.type],
      budget: plan.budgetLabel,
      message: planText(plan, a, true), ipHash, source: "planner",
      plan: { answers: a, recommended: plan.recommended, phased: plan.phased, options: plan.options.map((o) => ({ tier: o.tier, price: o.price, weeks: o.weeks })), pricesShown: pricing.showPrices, placeholderPrices: pricing.placeholder },
    });
    void notifySlack(lead);
    void addSystemNote(lead.id, "Lead captured via the project planner (/plan).").catch(() => {});
    void sendLeadEmails(lead).then((notes) => Promise.all(notes.map((n) => addSystemNote(lead.id, n)))).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plan] save failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Couldn't save right now — try WhatsApp instead." }, { status: 500 });
  }
}
