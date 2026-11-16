import { describe, it, expect, vi } from "vitest";
import { renderEmail, fillVars, PRESETS, LEAD_ACK, THEMES, safeUrl, spamHints, checkAttachments } from "@/lib/email-templates";

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

describe("deliverability guard rails", () => {
  it("flags caps subjects, shorteners and salesy words; clean mail passes", () => {
    expect(spamHints({ subject: "FREE OFFER FOR YOU", body: "x" })).toContain("Subject is mostly CAPITALS.");
    expect(spamHints({ subject: "Hi", body: "see https://bit.ly/abc" }).join(" ")).toMatch(/shorteners/);
    expect(spamHints({ subject: "Hi", body: "Click here now" }).join(" ")).toMatch(/Salesy/);
    expect(spamHints(PRESETS[0].content)).toEqual([]);
    expect(spamHints(LEAD_ACK.content)).toEqual([]);
  });
  it("limits attachments by type, count and size", () => {
    const pdf = { name: "q.pdf", type: "application/pdf", size: 200_000 };
    expect(checkAttachments([pdf])).toBeNull();
    expect(checkAttachments([{ name: "a.zip", type: "application/zip", size: 10 }])).toMatch(/only PDF/);
    expect(checkAttachments([pdf, pdf, pdf, pdf])).toMatch(/Up to 3/);
    expect(checkAttachments([{ ...pdf, size: 6 * 1048576 }])).toMatch(/under 5 MB/);
  });
  it("renders an https picture, ignores anything else", () => {
    expect(renderEmail("studio", { subject: "s", body: "b", image: "https://cdn.joyverse.fun/x.png" }).html).toContain('<img src="https://cdn.joyverse.fun/x.png"');
    expect(renderEmail("studio", { subject: "s", body: "b", image: "data:image/png;base64,AAA" }).html).not.toContain("<img");
  });
});

describe("auto-reply switch", () => {
  it("sends nothing when paused in settings", async () => {
    q.mockImplementation(async (sql: string) => sql.includes("app_settings") ? { rows: [{ value: { autoReply: false } }] } : { rows: [] });
    const { sendLeadEmails } = await import("@/lib/mail");
    process.env.RESEND_API_KEY = "re_x";
    const notes = await sendLeadEmails({ id: "00000000-0000-0000-0000-000000000000", name: "T", email: "t@real.com", message: "hello there" });
    expect(notes[0]).toMatch(/paused/);
    expect(q).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO email_log"), expect.arrayContaining(["t@real.com"]));
    delete process.env.RESEND_API_KEY;
  });
});
