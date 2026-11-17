import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

/**
 * GET /admin/design/preview?to=/          → turn on draft preview for this browser, then open `to`
 * GET /admin/design/preview?off=1&to=/    → turn it off
 * Only the signed-in admin can preview; the cookie alone never shows a draft (the layout checks the session too).
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const to = /^\/(?!\/)[\w\-/#?=&.%]*$/.test(u.searchParams.get("to") ?? "") ? u.searchParams.get("to")! : "/";
  // relative Location: behind the proxy, req.url's host is the container's, not the public domain
  const go = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });
  if (!(await isAuthenticated())) return go("/admin/login");
  const res = go(to);
  if (u.searchParams.get("off")) res.cookies.delete("nbs_preview");
  else res.cookies.set("nbs_preview", "1", { httpOnly: true, sameSite: "lax", path: "/", secure: u.protocol === "https:" });
  return res;
}
