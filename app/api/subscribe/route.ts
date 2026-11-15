import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp, clientIp } from "@/lib/leads";
import { upsertSubscriber, countRecentSubscribesByIp } from "@/lib/db";
import { getResourceEntries } from "@/lib/config";
import { accessMode, gatedPayload, isPublished } from "@/lib/resources";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 20; // per IP per hour (unlocks are cheap, but not free)

const schema = z.object({
  email: z.string().trim().email("That email doesn't look right.").max(160),
  list: z.enum(["resource", "nextbiz-one", "newsletter"]),
  source: z.string().trim().max(120).optional(),
  website: z.string().optional(), // honeypot
});

/**
 * POST /api/subscribe — library unlocks, NextBiz One waitlist, newsletter.
 * list=resource also returns the gated part of that resource.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Check your email." },
      { status: 422 },
    );
  }
  const { email, list, source = "", website } = parsed.data;
  if (website) return NextResponse.json({ ok: true });

  let entry = null;
  if (list === "resource") {
    entry = (await getResourceEntries()).find(
      (e) => isPublished(e) && e.slug.trim() === source && accessMode(e) === "email",
    );
    if (!entry) return NextResponse.json({ ok: false, error: "Resource not found." }, { status: 404 });
  }

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const recent = await countRecentSubscribesByIp(ipHash);
    if (!process.env.RATE_LIMIT_DISABLED && recent >= RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: false, error: "Too many tries — please wait a bit." }, { status: 429 });
    }
    await upsertSubscriber({ email, list, source: list === "resource" ? source : "", ipHash });
  } catch (err) {
    console.error("[subscribe] save failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong on our side — please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ...(entry ? { unlocked: gatedPayload(entry) } : {}) });
}
