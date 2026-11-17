"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isAuthenticated,
  destroySession,
  verifyCredentials,
  createSession,
  isLeadStatus,
} from "@/lib/auth";
import { moveLeadStatus, addLeadNote, getLead, addEmailNote } from "@/lib/db";
import { sendMail, mailOn } from "@/lib/mail";
import { renderEmail, isTheme, checkAttachments } from "@/lib/email-templates";
import { getEmailSettings, saveEmailSettings, type EmailSettings } from "@/lib/settings";
import { getDesignHistory, publishDesign, saveDraftDesign, type HistoryItem } from "@/lib/design";
import { savePricing } from "@/lib/planner";

/**
 * Admin server actions (S4). Every mutating action re-checks the session
 * server-side — client UI never proves auth, the cookie does, and the
 * action re-verifies it. Login is rate-limited in-memory per process:
 * single-admin surface, best-effort throttle that needs no store.
 */

const loginSchema = z.object({
  user: z.string().trim().min(1).max(120),
  pass: z.string().min(1).max(200),
});

const attempts = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a || Date.now() > a.reset) return false;
  return a.n >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const a = attempts.get(ip);
  if (!a || Date.now() > a.reset) {
    attempts.set(ip, { n: 1, reset: Date.now() + WINDOW_MS });
  } else {
    a.n += 1;
  }
}

export async function loginAction(prev: { error?: string } | null, formData: FormData) {
  const headers = await import("next/headers").then((m) => m.headers());
  const ip = headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (tooManyAttempts(ip)) {
    return { error: "Too many attempts — wait 15 minutes and try again." };
  }
  const parsed = loginSchema.safeParse({
    user: formData.get("user"),
    pass: formData.get("pass"),
  });
  if (!parsed.success) {
    return { error: "Enter both fields to sign in." };
  }
  let ok: boolean;
  try {
    ok = verifyCredentials(parsed.data.user, parsed.data.pass);
  } catch {
    return { error: "Admin login is not configured on the server." };
  }
  if (!ok) {
    recordFailure(ip);
    return { error: "That password doesn't match. Check caps lock, or contact the studio owner to reset." };
  }
  attempts.delete(ip);
  await createSession();
  const next = String(formData.get("next") ?? "/admin");
  redirect(["/admin", "/admin/"].some((p) => next.startsWith(p)) ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function setStatusAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isLeadStatus(status)) return;
  // moveLeadStatus also logs the move as a ledger entry ("old → new") so the
  // notes ledger + pipeline stepper keep honest history (wireframe spec).
  await moveLeadStatus(id, status);
  revalidatePath("/admin");
  revalidatePath(`/admin/lead/${id}`);
}

export async function addNoteAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note || note.length > 2000) return;
  await addLeadNote(id, note);
  revalidatePath("/admin");
  revalidatePath(`/admin/lead/${id}`);
}

export interface SendEmailState { ok?: boolean; message?: string; sentAt?: number }

const composeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  mode: z.enum(["send", "test"], { message: "Choose Send or Send test." }),
  theme: z.string().refine(isTheme, "Pick a theme."),
  subject: z.string().trim().min(2, "Add a subject.").max(160),
  heading: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(5, "Write a message.").max(8000),
  ctaLabel: z.string().trim().max(40).optional().default(""),
  ctaUrl: z.string().trim().max(500).optional().default(""),
  image: z.string().trim().max(500).optional().default(""),
});

const SAMPLE_LEAD = { name: "Asha Rao", service: "A new website" };

/**
 * Admin email send. mode=send → to the lead; mode=test → to your test inbox
 * (Email settings) with "[Test]" in the subject, so you see the real thing
 * in Gmail before the client does. Without a lead id (auto-reply editor)
 * only test mode is allowed and a sample name fills the {variables}.
 */
export async function sendEmailAction(_prev: SendEmailState | null, formData: FormData): Promise<SendEmailState> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = composeSchema.safeParse(fields);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  if (f.ctaUrl && !/^https:\/\//i.test(f.ctaUrl)) return { ok: false, message: "Button link must start with https://" };
  if (f.image && !/^https:\/\//i.test(f.image)) return { ok: false, message: "Picture must be an https:// link." };

  const files = formData.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  const bad = checkAttachments(files);
  if (bad) return { ok: false, message: bad };
  if (!mailOn()) return { ok: false, message: "Email isn't set up on this server yet (RESEND_API_KEY missing)." };

  const lead = f.id ? await getLead(f.id) : null;
  if (f.id && !lead) return { ok: false, message: "Lead not found." };
  if (f.mode === "send" && !lead) return { ok: false, message: "No lead to send to." };
  if (f.mode === "send" && !lead!.email) return { ok: false, message: "This lead didn't leave an email." };
  let to = lead?.email ?? "";
  if (f.mode === "test") {
    to = (await getEmailSettings()).testTo;
    if (!to) return { ok: false, message: "Add your test email in Email settings first." };
  }

  const theme = f.theme as Parameters<typeof renderEmail>[0];
  const r = renderEmail(theme, f, lead ?? SAMPLE_LEAD);
  if (f.mode === "test") r.subject = `[Test] ${r.subject}`;
  const attachments = await Promise.all(files.map(async (x) => ({
    filename: x.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120),
    content: Buffer.from(await x.arrayBuffer()).toString("base64"),
  })));
  const res = await sendMail({ to, ...r, attachments, kind: f.mode === "test" ? "test" : "compose", leadId: lead?.id ?? null, theme });
  if (!res.ok) return { ok: false, message: `Not sent — ${res.error}` };

  if (f.mode === "send" && lead) {
    await addEmailNote(lead.id, `Email sent: "${r.subject}"${files.length ? ` (+${files.length} attachment${files.length > 1 ? "s" : ""})` : ""}`);
    if (lead.status === "new") await moveLeadStatus(lead.id, "replied");
    revalidatePath("/admin");
    revalidatePath(`/admin/lead/${lead.id}`);
  }
  revalidatePath("/admin/email");
  return { ok: true, message: f.mode === "test" ? `Test sent to ${to} — check your inbox.` : `Sent to ${to}.`, sentAt: Date.now() };
}

export interface SettingsState { ok?: boolean; message?: string }

/** Email settings: auto-reply on/off, its content, and the test inbox. */
export async function saveEmailSettingsAction(_prev: SettingsState | null, formData: FormData): Promise<SettingsState> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const testTo = g("testTo");
  if (testTo && !z.string().email().safeParse(testTo).success) return { ok: false, message: "Test email doesn't look right." };
  const patch: Partial<EmailSettings> = { autoReply: g("autoReply") === "on", testTo };
  if (formData.has("subject")) {
    const theme = g("theme");
    if (!isTheme(theme)) return { ok: false, message: "Pick a theme." };
    if (g("subject").length < 2 || g("body").length < 5) return { ok: false, message: "Auto-reply needs a subject and a message." };
    const ctaUrl = g("ctaUrl"), image = g("image");
    if ((ctaUrl && !/^https:\/\//i.test(ctaUrl)) || (image && !/^https:\/\//i.test(image))) return { ok: false, message: "Links must start with https://" };
    patch.ackTheme = theme;
    patch.ack = { subject: g("subject").slice(0, 160), heading: g("heading").slice(0, 120), body: g("body").slice(0, 8000), ctaLabel: g("ctaLabel").slice(0, 40), ctaUrl, image };
  }
  await saveEmailSettings(patch);
  revalidatePath("/admin/email");
  return { ok: true, message: patch.autoReply ? "Saved — new leads get the thank-you." : "Saved — auto thank-you is paused." };
}

/* ── Design (Admin → Design) ── */
export interface DesignState { ok: boolean; message: string; history?: HistoryItem[] }

/** Save the draft (visible only in the admin's preview). */
export async function saveDesignDraftAction(raw: unknown): Promise<DesignState> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  await saveDraftDesign(raw);
  return { ok: true, message: "Draft saved — only you can see it in the preview." };
}

/** Publish: visitors see it straight away; the previous version goes into history. */
export async function publishDesignAction(raw: unknown): Promise<DesignState> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  await publishDesign(raw);
  revalidatePath("/", "layout");
  return { ok: true, message: "Published — nextbizstudio.com is using this design now.", history: await getDesignHistory() };
}

/* ── Planner pricing (Admin → Planner) ── */
export async function savePlannerAction(raw: unknown): Promise<{ ok: boolean; message: string }> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  // saving from admin means these are now the studio's real numbers
  await savePricing({ ...(raw as object), placeholder: false });
  revalidatePath("/plan");
  return { ok: true, message: "Saved — the planner uses these prices now." };
}
