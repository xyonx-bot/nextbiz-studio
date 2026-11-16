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
import { renderEmail, isTheme } from "@/lib/email-templates";

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
  id: z.string().uuid(),
  theme: z.string().refine(isTheme, "Pick a theme."),
  subject: z.string().trim().min(2, "Add a subject.").max(160),
  heading: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(5, "Write a message.").max(8000),
  ctaLabel: z.string().trim().max(40).optional().default(""),
  ctaUrl: z.string().trim().max(500).optional().default(""),
});

/** Admin → lead → Send email. Renders the chosen theme, sends via Resend, logs to the ledger. */
export async function sendEmailAction(_prev: SendEmailState | null, formData: FormData): Promise<SendEmailState> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const parsed = composeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  if (f.ctaUrl && !/^https?:\/\//i.test(f.ctaUrl)) return { ok: false, message: "Button link must start with https://" };
  if (!mailOn()) return { ok: false, message: "Email isn't set up on this server yet (RESEND_API_KEY missing)." };
  const lead = await getLead(f.id);
  if (!lead) return { ok: false, message: "Lead not found." };
  if (!lead.email) return { ok: false, message: "This lead didn't leave an email." };

  const theme = f.theme as Parameters<typeof renderEmail>[0];
  const r = renderEmail(theme, f, lead);
  const res = await sendMail({ to: lead.email, ...r, kind: "compose", leadId: lead.id, theme });
  if (!res.ok) return { ok: false, message: `Not sent — ${res.error}` };

  await addEmailNote(lead.id, `Email sent: "${r.subject}"`);
  if (lead.status === "new") await moveLeadStatus(lead.id, "replied");
  revalidatePath("/admin");
  revalidatePath(`/admin/lead/${lead.id}`);
  return { ok: true, message: `Sent to ${lead.email}.`, sentAt: Date.now() };
}
