import Link from "next/link";

/** Routes for every public page. Single source — nav and footer both use it. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
] as const;

export const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms & Conditions" },
  { href: "/legal/refund", label: "Refund & Cancellation" },
  { href: "/legal/cookie", label: "Cookie Policy" },
] as const;

export const SERVICE_LINKS = [
  { href: "/services#c01", label: "Web & Digital Products" },
  { href: "/services#c02", label: "Marketing & Growth" },
  { href: "/services#c03", label: "WhatsApp & Meta Solutions" },
  { href: "/services#meta-proxy", label: "Meta Proxy" },
] as const;

/**
 * Real contact details — supplied by Joydip Oct 23 (r-nbs-s6, s6-content-inputs).
 * Rendered by Topbar call cell, home inline calls, and the contact qclose CTA.
 * (email has no chrome surface yet; the contact page shows it via its
 * desk.channels content — configurator-driven.)
 */
export const CONTACT = {
  phoneDisplay: "+91 90887 27191",
  phoneTel: "+919088727191",
  email: "nextbizstudio@gmail.com",
} as const;

/** WhatsApp click-to-chat (P1.4) — env-driven number, prefilled message. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919088727191";
export const WHATSAPP_PREFILL =
  process.env.NEXT_PUBLIC_WHATSAPP_PREFILL ??
  "Hi NextBiz Studio — I'd like to talk about a project.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`;
