/**
 * Client portal emails + studio pings. Every send is logged in email_log (with the client).
 * Nothing here throws: a failed email never blocks the action that caused it.
 */
import { sendMail } from "./mail";
import { renderEmail } from "./email-templates";
import { siteUrl, type Client, type Project, STAGES } from "./portal";

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

async function mail(c: Client, kind: "portal_code" | "portal_invite" | "portal_notify", subject: string, heading: string, body: string, cta?: { label: string; url: string }) {
  const r = renderEmail("studio", { subject, heading, body, ctaLabel: cta?.label, ctaUrl: cta?.url });
  return sendMail({ to: c.email, subject: r.subject, html: r.html, text: r.text, kind, clientId: c.id, theme: "studio" }).catch((e) => ({ ok: false as const, error: (e as Error).message }));
}

export async function sendLoginCode(c: Client, code: string) {
  return mail(c, "portal_code", `Your NextBiz login code: ${code}`, `Your code: ${code}`,
    `Hi ${first(c.name)},\n\nUse this code to log in to your NextBiz client portal: ${code}\n\nIt works for 15 minutes. If you didn't ask for it, you can ignore this email.`);
}

export async function sendInvite(c: Client, linkToken: string, projectTitle?: string) {
  const site = await siteUrl();
  return mail(c, "portal_invite", "Your NextBiz client portal is ready", `Welcome, ${first(c.name)}`,
    `Your client portal is ready${projectTitle ? ` for “${projectTitle}”` : ""}. It's where you can follow your project, message the person doing the work, and find every file we share.\n\nThe button below logs you straight in (it works once, for 7 days). After that, log in any time at ${site}/portal with this email address. We'll send you a 6-digit code, no password needed.`,
    { label: "Open my portal", url: `${site}/portal/l/${linkToken}` });
}

export async function notifyClient(c: Client, p: Project, what: "update" | "message" | "stage" | "request" | "file", detail: string) {
  if (!c.portal_enabled) return;
  const site = await siteUrl();
  const tab = what === "message" ? "messages" : what === "file" ? "files" : "overview";
  const lines: Record<typeof what, [string, string]> = {
    update: [`New update on ${p.title}`, `There's a new update on your project:\n\n${detail.slice(0, 600)}`],
    message: [`New message about ${p.title}`, `You have a new message from the studio:\n\n${detail.slice(0, 600)}`],
    stage: [`${p.title} moved to ${STAGES.find((s) => s.id === detail)?.label ?? detail}`, `Your project just moved to the ${STAGES.find((s) => s.id === detail)?.label ?? detail} stage.`],
    request: [`We need something for ${p.title}`, `To keep things moving we need: ${detail}`],
    file: [`New file on ${p.title}`, `We shared a new file with you: ${detail}`],
  };
  const [subject, body] = lines[what];
  await mail(c, "portal_notify", subject, subject, `Hi ${first(c.name)},\n\n${body}`, { label: "Open my portal", url: `${site}/portal/p/${p.id}?tab=${tab}` });
}

/** Tell the studio (Slack + the owner's inbox) that a client wrote or uploaded something. */
export async function notifyStudio(c: Client, p: Project, what: "message" | "file", detail: string) {
  const site = await siteUrl();
  const text = `*${c.name}${c.business ? ` (${c.business})` : ""}* ${what === "message" ? "sent a message" : "uploaded a file"} on *${p.title}*\n> ${detail.slice(0, 400)}\n${site}/admin/clients/${c.id}/p/${p.id}`;
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (hook) await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {});
  const to = process.env.LEAD_ALERT_TO;
  if (to) {
    const r = renderEmail("plain", { subject: `${c.name}: ${what === "message" ? "new message" : "new file"} on ${p.title}`, body: `${detail.slice(0, 1500)}\n\nOpen it: ${site}/admin/clients/${c.id}/p/${p.id}` });
    await sendMail({ to, subject: r.subject, html: r.html, text: r.text, kind: "portal_alert", clientId: c.id, theme: "plain" }).catch(() => {});
  }
}
