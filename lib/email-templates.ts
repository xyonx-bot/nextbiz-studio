/**
 * Email themes + message presets. Pure (no node imports) so the admin
 * composer can render the exact same HTML for its live preview.
 *
 * Body text rules: blank line → new paragraph, single newline → line break,
 * bare https:// links become links. {name}, {first_name} and {service}
 * are filled from the lead.
 */

export const THEMES = [
  { id: "studio", label: "Studio", hint: "Dark brand header, bold — for welcomes and proposals" },
  { id: "light", label: "Light", hint: "Clean white card — for everyday replies" },
  { id: "plain", label: "Plain letter", hint: "Looks hand-written — best for inbox, not promotions" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const isTheme = (v: string): v is ThemeId => THEMES.some((t) => t.id === v);

export interface EmailContent {
  subject: string;
  heading?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Optional picture (https URL on our CDN). Linked, never embedded — embedded images hurt inbox placement. */
  image?: string;
}
export interface LeadVars { name?: string | null; service?: string | null }

export const BRAND = {
  name: "NextBiz Studio",
  site: "https://nextbizstudio.com",
  whatsapp: "https://wa.me/919088727191?text=START",
  whatsappLabel: "+91 90887 27191",
  signoff: "Team NextBiz Studio",
};

/** Ready-made messages the admin can start from (then edit). */
export const PRESETS: { id: string; label: string; theme: ThemeId; content: EmailContent }[] = [
  {
    id: "next-steps", label: "Thanks — next steps", theme: "studio",
    content: {
      subject: "Next steps for your project, {first_name}",
      heading: "Let's get you moving",
      body: "Hi {first_name},\n\nThanks for telling us about your project. We've read your brief and have a few ideas already.\n\nThe quickest next step is a 15-minute call so we can understand your goals and give you a clear plan and price. Reply with a time that suits you, or message us on WhatsApp.",
      ctaLabel: "Chat on WhatsApp", ctaUrl: BRAND.whatsapp,
    },
  },
  {
    id: "quote", label: "Quote follow-up", theme: "light",
    content: {
      subject: "Your quote from NextBiz Studio",
      heading: "Your quote is ready",
      body: "Hi {first_name},\n\nAs promised, here's where we landed for {service}.\n\n[Write the scope, timeline and price here]\n\nIf anything needs adjusting, just reply to this email — happy to tune it to your budget.",
    },
  },
  {
    id: "check-in", label: "Friendly check-in", theme: "plain",
    content: {
      subject: "Quick check-in",
      body: "Hi {first_name},\n\nJust checking in on the project you reached out about. Is it still on your list?\n\nIf now isn't the right time, no worries at all — reply \"later\" and we'll follow up in a few weeks.",
    },
  },
  { id: "blank", label: "Blank", theme: "light", content: { subject: "", heading: "", body: "Hi {first_name},\n\n" } },
];

/** Automatic thank-you sent the moment a lead with an email comes in. */
export const LEAD_ACK: { theme: ThemeId; content: EmailContent } = {
  theme: "studio",
  content: {
    subject: "We got your message, {first_name}",
    heading: "Thanks for reaching out",
    body: "Hi {first_name},\n\nThis is a quick note to say your message reached us. A real person from NextBiz Studio will reply within one working day — usually much sooner.\n\nWant a faster answer? Message us on WhatsApp and we'll pick it up there.\n\nWhile you wait, our free library has prompt packs, n8n workflows and guides you can use today: https://nextbizstudio.com/resources",
    ctaLabel: "Chat on WhatsApp", ctaUrl: BRAND.whatsapp,
  },
};

/* ── rendering ─────────────────────────────────────────── */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function fillVars(s: string, v: LeadVars): string {
  const name = (v.name ?? "").trim();
  const first = name.split(/\s+/)[0] || "there";
  return s
    .replace(/\{first_name\}/g, first)
    .replace(/\{name\}/g, name || "there")
    .replace(/\{service\}/g, (v.service ?? "").trim() || "your project");
}

export const safeUrl = (u?: string) => (u && /^(https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : "");

function bodyHtml(body: string, p: string, a: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const html = esc(para)
        .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="${a}">${u}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="${p}">${html}</p>`;
    })
    .join("");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderEmail(theme: ThemeId, c: EmailContent, v: LeadVars = {}): { subject: string; html: string; text: string } {
  const subject = fillVars(c.subject, v).trim();
  const heading = fillVars(c.heading ?? "", v).trim();
  const body = fillVars(c.body, v);
  const ctaUrl = safeUrl(c.ctaUrl);
  const ctaLabel = (c.ctaLabel ?? "").trim();
  const cta = ctaUrl && ctaLabel ? { url: ctaUrl, label: ctaLabel } : null;
  const img = /^https:\/\//i.test(c.image?.trim() ?? "") ? c.image!.trim() : "";
  const imgHtml = (w: number) => img
    ? `<img src="${esc(img)}" width="${w}" alt="${esc(heading || subject)}" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;margin:0 0 20px">`
    : "";

  const text = [
    heading, heading ? "" : null, body.trim(), "",
    cta ? `${cta.label}: ${cta.url}` : null, cta ? "" : null,
    `— ${BRAND.signoff}`, `${BRAND.site.replace("https://", "")} · WhatsApp ${BRAND.whatsappLabel}`,
  ].filter((l) => l !== null).join("\n");

  const pre = `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(body.trim().slice(0, 140))}</div>`;
  const wrap = (bg: string, inner: string) =>
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${bg};font-family:${FONT}">${pre}` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg}"><tr><td align="center" style="padding:28px 14px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">${inner}</table></td></tr></table></body></html>`;

  if (theme === "plain") {
    const P = "margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a1a1a";
    const A = "color:#1a1a1a;text-decoration:underline";
    const inner =
      `<tr><td style="padding:4px 2px">${heading ? `<p style="${P};font-weight:700">${esc(heading)}</p>` : ""}${bodyHtml(body, P, A)}${imgHtml(560)}` +
      (cta ? `<p style="${P}"><a href="${esc(cta.url)}" style="${A};font-weight:600">${esc(cta.label)} →</a></p>` : "") +
      `<p style="${P};margin-top:22px">— ${esc(BRAND.signoff)}<br><span style="color:#666;font-size:13px"><a href="${BRAND.site}" style="color:#666">${BRAND.site.replace("https://", "")}</a> · WhatsApp ${BRAND.whatsappLabel}</span></p></td></tr>`;
    return { subject, text, html: wrap("#ffffff", inner) };
  }

  const dark = theme === "studio";
  const P = "margin:0 0 16px;font-size:15px;line-height:1.65;color:#2a2a2a";
  const A = "color:#0E0E0E;text-decoration:underline";
  const head = dark
    ? `<tr><td style="background:#0E0E0E;padding:22px 28px"><span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase">${BRAND.name}</span></td></tr>`
    : `<tr><td style="padding:0 0 14px"><span style="color:#0E0E0E;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">${BRAND.name}</span></td></tr>`;
  const card =
    `<tr><td style="background:#ffffff;border:1px solid #E4E1DC;${dark ? "border-top:0;" : "border-top:3px solid #0E0E0E;"}padding:30px 28px">` +
    (heading ? `<h1 style="margin:0 0 18px;font-size:${dark ? 26 : 22}px;line-height:1.2;font-weight:800;color:#0E0E0E;letter-spacing:-.4px">${esc(heading)}</h1>` : "") +
    imgHtml(522) +
    bodyHtml(body, P, A) +
    (cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="background:#0E0E0E"><a href="${esc(cta.url)}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${esc(cta.label)} →</a></td></tr></table>` : "") +
    `<p style="${P};margin:22px 0 0">— ${esc(BRAND.signoff)}</p></td></tr>`;
  const foot =
    `<tr><td style="padding:16px 4px;font-size:12px;line-height:1.6;color:#8A8680">` +
    `<a href="${BRAND.site}" style="color:#8A8680">${BRAND.site.replace("https://", "")}</a> · <a href="${BRAND.whatsapp}" style="color:#8A8680">WhatsApp ${BRAND.whatsappLabel}</a><br>` +
    `You're getting this because you contacted ${BRAND.name}. Just reply to talk to us.</td></tr>`;
  return { subject, text, html: wrap(dark ? "#F4F2EE" : "#F7F6F3", head + card + foot) };
}

/* ── deliverability guard rails ─────────────────────────── */

/** Attachments: documents and pictures only, small, few. Zips, HTML and executables are what spam filters hunt. */
export const ATTACH = {
  maxFiles: 3,
  maxTotalBytes: 5 * 1024 * 1024,
  types: {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt", "text/csv": "csv",
  } as Record<string, string>,
  accept: ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.csv",
};

export function checkAttachments(files: { name: string; type: string; size: number }[]): string | null {
  if (files.length > ATTACH.maxFiles) return `Up to ${ATTACH.maxFiles} attachments.`;
  for (const f of files) {
    if (!ATTACH.types[f.type]) return `${f.name}: only PDF, images, Word, Excel, PowerPoint, TXT or CSV.`;
  }
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > ATTACH.maxTotalBytes) return `Attachments add up to ${(total / 1048576).toFixed(1)} MB — keep it under 5 MB (share a link for bigger files).`;
  return null;
}

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy)\//i;
const SPAMMY = /\b(free money|act now|100% free|guaranteed|risk[- ]free|click here|winner|urgent|limited time|cash bonus)\b/i;

/** Gentle warnings shown under the composer — things that push mail into spam/promotions. */
export function spamHints(c: EmailContent, attachments = 0): string[] {
  const out: string[] = [];
  const letters = c.subject.replace(/[^a-z]/gi, "");
  if (letters.length >= 8 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) out.push("Subject is mostly CAPITALS.");
  if (/[!?]{2,}|\$\$|₹₹/.test(c.subject)) out.push("Repeated !!! or symbols in the subject.");
  if (SPAMMY.test(`${c.subject} ${c.body} ${c.ctaLabel ?? ""}`)) out.push("Salesy phrase (\"click here\", \"guaranteed\", \"limited time\"…) — reword it.");
  if (SHORTENERS.test(`${c.body} ${c.ctaUrl ?? ""}`)) out.push("Link shorteners (bit.ly etc.) are a spam signal — use the full link.");
  if (c.body.trim().length < 60 && (c.image || attachments)) out.push("Very little text next to a picture/attachment — add a couple of sentences.");
  if ((c.body.match(/https?:\/\//g) ?? []).length > 4) out.push("Lots of links — keep it to 2–3.");
  return out;
}
