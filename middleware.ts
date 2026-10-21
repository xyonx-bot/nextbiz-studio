import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection (S4, P1.5). middleware.ts runs for /admin and /admin/*
 * BEFORE any admin page renders. Session validity is checked inside the
 * admin layout too — middleware is the redirect gate, layout is defense in
 * depth (belt and suspenders: a broken middleware must not leak the inbox).
 *
 * The middleware runs on the Edge runtime, so the cookie HMAC verify uses
 * Web Crypto (available there) rather than node:crypto.
 */

const COOKIE_NAME = "nbs_admin";

async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
  if (!valid) return false;
  const payload = new TextDecoder().decode(
    Uint8Array.from(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    ),
  );
  if (!payload.startsWith("exp:")) return false;
  const expires = Number(payload.slice(4));
  return Number.isFinite(expires) && expires > Date.now();
}

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  // Unconfigured secret: fail CLOSED (no admin access at all), never open.
  if (!secret || secret.length < 16) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const ok = await verifyToken(req.cookies.get(COOKIE_NAME)?.value, secret);
  if (!ok) {
    const url = new URL("/admin/login", req.url);
    // after login, land back where the admin was headed
    if (req.nextUrl.pathname !== "/admin") url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
