import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Admin session (S4, P1.5 — technical-plan §6).
 *
 * Design: single admin account from env (ADMIN_USER / ADMIN_PASS), no user
 * table. Session = stateless signed cookie — payload is "expiry" only, HMAC'd
 * with SESSION_SECRET. Stateless means no session store to sync between
 * container recreates; logout = clear cookie + bump of nothing.
 *
 * Threat model, honestly scoped:
 *   - credentials compared timing-safe (no user-enumeration side channel)
 *   - HMAC means forged cookies need the secret; payload carries no rights
 *   - cookie is HttpOnly, SameSite=Lax, Secure in production
 *   - brute force: bcrypt would add work-factor; for a single known-name
 *     admin on an internal-ish surface behind the site's nginx, SHA-256
 *     comparison + long random password from env is proportionate. If NBS
 *     ever adds multi-user, move to argon2 + per-user salts (noted in
 *     technical-plan as S6+ hardening).
 */

const COOKIE_NAME = "nbs_admin";
const SESSION_TTL_HOURS = 12;

export const LEAD_STATUSES = ["new", "replied", "quoted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars) — see .env.example");
  }
  return s;
}

/** Timing-safe string compare — both sides hashed to equal length first. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Check credentials from env. False on mismatch; throws if unconfigured. */
export function verifyCredentials(user: string, pass: string): boolean {
  const eu = process.env.ADMIN_USER;
  const ep = process.env.ADMIN_PASS;
  if (!eu || !ep) throw new Error("ADMIN_USER / ADMIN_PASS not set — see .env.example");
  return safeEqual(user, eu) && safeEqual(pass, ep);
}

/** HMAC session token: base64url(payload).base64url(hmac(base64url(payload))). */
function sign(payload: string): string {
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function unsign(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Buffer.from(payload, "base64url").toString("utf8");
}

/**
 * Secure flag follows the ACTUAL request protocol via X-Forwarded-Proto
 * (nginx sets $scheme), not NODE_ENV — the standalone server always runs
 * with NODE_ENV=production, which wrongly marked plain-HTTP test servers
 * (and any future direct-IP access) as Secure and dropped the cookie.
 */
async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  return (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim() === "https";
}

/** Issue a fresh session: sets the cookie via the App Router cookie store. */
export async function createSession(): Promise<void> {
  const expires = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const jar = await cookies();
  jar.set(COOKIE_NAME, sign(`exp:${expires}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: await isSecureRequest(),
    path: "/",
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

/** True if the request carries a valid, unexpired session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = unsign(token);
  if (!payload?.startsWith("exp:")) return false;
  const expires = Number(payload.slice(4));
  return Number.isFinite(expires) && expires > Date.now();
}

/** Kill the session cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
