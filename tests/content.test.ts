import { describe, expect, it } from "vitest";
import { CONTACT, WHATSAPP_URL, WHATSAPP_NUMBER, WHATSAPP_PREFILL } from "@/lib/content";
import contactSeed from "@/lib/seed/contact.json";

/**
 * S6 (r-nbs-s6) — real contact details, supplied by Joydip Oct 23
 * (s6-content-inputs.md): phone/WhatsApp 9088727191, business email
 * nextbizstudio@gmail.com. These tests pin BOTH surfaces:
 *  - the compiled chrome consts (topbar call cell, home inline calls, qclose
 *    tel link, wa.me fallback) — lib/content.ts
 *  - the seed fallback truth (contact page desk channels + qclose CTA when
 *    the DB has no override — and the render fallback if the DB is ever down)
 * so the placeholder numbers can never silently return.
 */

const PLACEHOLDERS = ["22 (00) 356 7890", "+910000000000", "910000000000", "hello@nextbizstudio.com"];

describe("CONTACT consts (compiled chrome surfaces)", () => {
  it("carries the real Joydip-supplied details", () => {
    expect(CONTACT.phoneDisplay).toBe("+91 90887 27191");
    expect(CONTACT.phoneTel).toBe("+919088727191");
    expect(CONTACT.email).toBe("nextbizstudio@gmail.com");
  });

  it("tel link digits match the displayed number (one number, two formats)", () => {
    expect(CONTACT.phoneTel.replace(/\D/g, "")).toBe(CONTACT.phoneDisplay.replace(/\D/g, ""));
    expect(CONTACT.phoneTel).toMatch(/^\+91\d{10}$/);
  });

  it("contains no placeholder contact detail", () => {
    for (const p of PLACEHOLDERS) {
      expect(JSON.stringify(CONTACT)).not.toContain(p);
    }
  });
});

describe("WhatsApp click-to-chat (env-driven, real default)", () => {
  it("falls back to the real business number when env is unset (CI)", () => {
    const expectDefault = !process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    if (expectDefault) expect(WHATSAPP_NUMBER).toBe("919088727191");
    else expect(WHATSAPP_NUMBER).toBe(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  });

  it("deep link shape: wa.me/<number>?text=<prefill>", () => {
    expect(WHATSAPP_URL).toBe(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`,
    );
    expect(WHATSAPP_URL).toMatch(/^https:\/\/wa\.me\/91\d{10}\?text=/);
  });
});

describe("contact seed = honest fallback truth (desk channels + qclose)", () => {
  it("desk channels carry the real Call + Email values", () => {
    const channels = contactSeed.desk.channels as Array<{ ch: string; val: string }>;
    const byName = Object.fromEntries(channels.map((c) => [c.ch, c.val]));
    expect(byName.Call).toBe(CONTACT.phoneDisplay);
    expect(byName.Email).toBe(CONTACT.email);
    expect(byName.Studio).toBe("Kolkata, India");
  });

  it("qclose CTA calls the real number", () => {
    expect(contactSeed.qclose.cta).toBe("Call +91 90887 27191");
  });

  it("no placeholder contact detail anywhere in the seed", () => {
    const blob = JSON.stringify(contactSeed);
    for (const p of PLACEHOLDERS) {
      expect(blob).not.toContain(p);
    }
  });
});
