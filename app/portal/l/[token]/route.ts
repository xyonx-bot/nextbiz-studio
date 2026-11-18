import { NextResponse } from "next/server";
import { consumeLoginLink, startClientSession, siteUrl } from "@/lib/portal";

/** One-time login link (invite email, or copied by the studio). Works once, then sends you to the portal. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = await siteUrl();
  const c = await consumeLoginLink(token);
  if (!c) return NextResponse.redirect(`${base}/portal/login?link=expired`, 303);
  await startClientSession(c.id);
  return NextResponse.redirect(`${base}/portal${c.has_password ? "" : "?welcome=1"}`, 303);
}
