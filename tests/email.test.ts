import { describe, it, expect, vi } from "vitest";
import { renderEmail, fillVars, PRESETS, LEAD_ACK, THEMES, safeUrl } from "@/lib/email-templates";

const q = vi.fn().mockResolvedValue({ rows: [] });
vi.mock("@/lib/db", () => ({ getPool: () => ({ query: q }) }));

describe("email templates", () => {
  it("fills lead variables with safe fallbacks", () => {
    expect(fillVars("Hi {first_name} / {name} / {service}", { name: "Rahul Sharma", service: "A new website" }))
      .toBe("Hi Rahul / Rahul Sharma / A new website");
    expect(fillVars("Hi {first_name}, {service}", {})).toBe("Hi there, your project");
  });

  it("escapes user text and keeps links clickable", () => {
    const r = renderEmail("light", { subject: "S", body: "<script>x</script>\n\nsee https://nextbizstudio.com/resources." }, {});
    expect(r.html).not.toContain("<script>x");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).toContain('href="https://nextbizstudio.com/resources"');
  });

  it("drops buttons with unsafe links", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    const r = renderEmail("studio", { subject: "S", body: "b", ctaLabel: "Go", ctaUrl: "javascript:alert(1)" });
    expect(r.html).not.toContain("javascript:");
  });

  it("renders every preset in every theme with subject, html and text", () => {
    for (const p of PRESETS) for (const t of THEMES) {
      const r = renderEmail(t.id, { ...p.content, subject: p.content.subject || "x" }, { name: "Asha" });
      expect(r.html).toMatch(/^<!doctype html>/);
      expect(r.text).toContain("Team NextBiz Studio");
      expect(r.html).not.toMatch(/\{(first_name|name|service)\}/);
    }
  });

  it("auto thank-you greets the lead and links WhatsApp", () => {
    const r = renderEmail(LEAD_ACK.theme, LEAD_ACK.content, { name: "Asha Rao" });
    expect(r.subject).toBe("We got your message, Asha");
    expect(r.html).toContain("wa.me/919088727191");
  });
});

describe("sendMail", () => {
  it("skips (and logs) when no API key or a test address", async () => {
    const { sendMail, sendLeadEmails } = await import("@/lib/mail");
    delete process.env.RESEND_API_KEY;
    const r = await sendMail({ to: "a@real.com", subject: "s", html: "h", text: "t", kind: "test" });
    expect(r.ok).toBe(false);
    expect(q).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO email_log"), expect.arrayContaining(["skipped"]));
    process.env.RESEND_API_KEY = "re_x";
    const notes = await sendLeadEmails({ id: "00000000-0000-0000-0000-000000000000", name: "T", email: "t@example.com", message: "hello there" });
    expect(notes[0]).toMatch(/not sent — Test address/);
    delete process.env.RESEND_API_KEY;
  });
});
