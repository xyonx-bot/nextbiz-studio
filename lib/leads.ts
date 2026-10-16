import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Lead validation (technical-plan §5, mapped from Mira's contact wireframe).
 * Neutral prompts stay neutral — service/budget are optional enums whose
 * wireframe values live in the contact seed; we validate against the same
 * option strings the form renders.
 */
export const SERVICE_OPTIONS = [
  "A new website",
  "Marketing & social media",
  "WhatsApp / Meta solutions",
  "Meta Proxy (the product)",
  "Not sure yet — help me shape it",
] as const;

export const BUDGET_OPTIONS = [
  "Under ₹25k",
  "₹25k – ₹75k",
  "₹75k – ₹2L",
  "Not sure yet",
] as const;

const phoneRe = /^\+?[0-9][0-9\s\-()]{6,19}$/; // E.164-ish, forgiving (placeholder copy says "+91 …")

/** "" (neutral prompt) → undefined, so optional enums stay optional. */
const emptyToUndef = (v: unknown) => (v === "" || v === undefined ? undefined : v) as string | undefined;

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  phone: z.string().trim().max(24).optional().or(z.literal("")),
  email: z.string().trim().email("That email doesn't look right.").max(160).optional().or(z.literal("")),
  service: z.preprocess(emptyToUndef, z.enum(SERVICE_OPTIONS).optional()),
  budget: z.preprocess(emptyToUndef, z.enum(BUDGET_OPTIONS).optional()),
  message: z.string().trim().min(10, "A few honest lines beat a polished document — tell us a little more.").max(4000),
  // honeypot: schema IGNORES it entirely (zod v4 strict off) — the route
  // silently fake-oks any request that fills it, so bots learn nothing.
  website: z.string().optional(),
}).superRefine((v, ctx) => {
  const hasPhone = v.phone && v.phone.length >= 7;
  const hasEmail = v.email && v.email.includes("@");
  if (!hasPhone && !hasEmail) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Leave a phone number or an email so we can reply.",
    });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Salted IP hash — rate-limit evidence only, never displayed. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "nextbiz-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Extract client IP behind nginx (x-forwarded-for first hop). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
