/**
 * Outgoing email via Resend (same nextbizstudio.com domain NextBiz One uses).
 *   RESEND_API_KEY  → required; without it nothing is sent and the attempt is logged "skipped"
 *   MAIL_FROM       → sender, default "NextBiz Studio <hello@nextbizstudio.com>"
 *   MAIL_REPLY_TO   → where client replies land (optional)
 *   LEAD_ALERT_TO   → optional: your inbox for a "new lead" email (Slack still pings either way)
 * Every attempt lands in email_log.
 */
import { getPool } from "./db";
import { renderEmail, type ThemeId } from "./email-templates";
import { getEmailSettings } from "./settings";

export type MailKind = "lead_ack" | "lead_alert" | "compose" | "test";
export interface Mail {
  to: string; subject: string; html: string; text: string; kind: MailKind;
  leadId?: string | null; theme?: ThemeId | null;
  attachments?: { filename: string; content: string /* base64 */ }[];
}
export type MailResult = { ok: true; id: string } | { ok: false; skipped?: boolean; error: string };

export const mailOn = () => Boolean(process.env.RESEND_API_KEY);
const FROM = () => process.env.MAIL_FROM || "NextBiz Studio <hello@nextbizstudio.com>";

/** Reserved test domains never get real email. */
export const isTestAddress = (to: string) =>
  /@([^@]+\.)?(test|example|invalid|localhost)$|@example\.(com|org|net)$/i.test(to.trim());

async function viaResend(m: Mail): Promise<MailResult> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(), to: [m.to], subject: m.subject, html: m.html, text: m.text,
        ...(m.attachments?.length ? { attachments: m.attachments } : {}),
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
        tags: [{ name: "app", value: "studio" }, { name: "kind", value: m.kind }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const d = (await r.json().catch(() => null)) as { id?: string; message?: string } | null;
    return r.ok && d?.id ? { ok: true, id: d.id } : { ok: false, error: d?.message ?? `Resend error ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function sendMail(m: Mail): Promise<MailResult> {
  const res: MailResult = isTestAddress(m.to)
    ? { ok: false, skipped: true, error: "Test address — not sent" }
    : !mailOn()
      ? { ok: false, skipped: true, error: "Email isn't set up on this server (RESEND_API_KEY)" }
      : await viaResend(m);
  const status = res.ok ? "sent" : "skipped" in res && res.skipped ? "skipped" : "failed";
  await getPool().query(
    `INSERT INTO email_log (lead_id, to_email, kind, theme, subject, body, status, provider_id, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [m.leadId ?? null, m.to, m.kind, m.theme ?? null, m.subject, m.text.slice(0, 8000) + (m.attachments?.length ? `\n\n[attached: ${m.attachments.map((a) => a.filename).join(", ")}]` : ""), status,
     res.ok ? res.id : null, res.ok ? null : res.error.slice(0, 500)],
  ).catch((e) => console.error("[mail] log failed:", (e as Error).message));
  if (status === "failed") console.error(`[mail] ${m.kind} to ${m.to.replace(/^(.).*@/, "$1•••@")} failed: ${(res as { error: string }).error}`);
  return res;
}

export interface EmailLogRow {
  id: string; lead_id: string | null; to_email: string; kind: string; theme: string | null;
  subject: string; body: string | null; status: string; error: string | null; created_at: Date;
}
export async function listRecentEmails(limit = 50): Promise<(EmailLogRow & { lead_name: string | null })[]> {
  const { rows } = await getPool().query<EmailLogRow & { lead_name: string | null }>(
    `SELECT e.id, e.lead_id, e.to_email, e.kind, e.theme, e.subject, NULL AS body, e.status, e.error, e.created_at, l.name AS lead_name
       FROM email_log e LEFT JOIN leads l ON l.id = e.lead_id ORDER BY e.created_at DESC LIMIT $1`, [limit]);
  return rows;
}

export async function listEmailsForLead(leadId: string): Promise<EmailLogRow[]> {
  const { rows } = await getPool().query<EmailLogRow>(
    `SELECT id, lead_id, to_email, kind, theme, subject, body, status, error, created_at
       FROM email_log WHERE lead_id = $1 ORDER BY created_at DESC`, [leadId]);
  return rows;
}

const noteFor = (r: MailResult, what: string, to: string) =>
  r.ok ? `${what} sent to ${to}.` : `${what} to ${to} not sent — ${r.error}`;

/** New-lead emails: thank-you to the lead (if they gave an email) + optional alert to you. Never throws. */
export async function sendLeadEmails(lead: {
  id: string; name: string; email?: string | null; phone?: string | null;
  service?: string | null; budget?: string | null; message: string;
}): Promise<string[]> {
  const notes: string[] = [];
  try {
    const cfg = await getEmailSettings();
    if (lead.email && !cfg.autoReply) {
      notes.push("Auto thank-you is paused in Email settings — nothing sent.");
    } else if (lead.email) {
      const r = renderEmail(cfg.ackTheme, cfg.ack, lead);
      const res = await sendMail({ to: lead.email, ...r, kind: "lead_ack", leadId: lead.id, theme: cfg.ackTheme });
      notes.push(noteFor(res, "Auto thank-you email", lead.email));
    }
    const alertTo = process.env.LEAD_ALERT_TO;
    if (alertTo) {
      const site = process.env.SITE_URL || "https://nextbizstudio.com";
      const r = renderEmail("plain", {
        subject: `New lead — ${lead.name}${lead.service ? ` · ${lead.service}` : ""}`,
        body: [
          `Name: ${lead.name}`, `Email: ${lead.email || "—"}`, `Phone: ${lead.phone || "—"}`,
          `Service: ${lead.service || "—"}`, `Budget: ${lead.budget || "—"}`,
        ].join("\n") + `\n\n${lead.message}`,
        ctaLabel: "Open in admin", ctaUrl: `${site}/admin/lead/${lead.id}`,
      });
      await sendMail({ to: alertTo, ...r, kind: "lead_alert", leadId: lead.id, theme: "plain" });
    }
  } catch (e) {
    console.error("[mail] lead emails failed:", (e as Error).message);
  }
  return notes;
}
