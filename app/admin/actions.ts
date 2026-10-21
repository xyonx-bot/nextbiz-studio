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
import { setLeadStatus, addLeadNote } from "@/lib/db";

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
    return { error: "That didn't match — check and try again." };
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
  await setLeadStatus(id, status);
  revalidatePath("/admin");
}

export async function addNoteAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note || note.length > 2000) return;
  await addLeadNote(id, note);
  revalidatePath("/admin");
}
