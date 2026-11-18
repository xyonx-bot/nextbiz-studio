"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  FILE_MAX_BYTES, addFile, addLink, addMessage, checkPassword, currentClient, endClientSession, getClientByEmail, getProject,
  issueLoginCode, setClientPassword, startClientSession, verifyLoginCode, verifyPasswordLogin,
} from "@/lib/portal";
import { notifyStudio, sendLoginCode } from "@/lib/portal-notify";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; note?: string } | null;

/* simple per-process limiter: 10 login tries per IP per 10 minutes */
const hits = new Map<string, number[]>();
async function limited(scope: string): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const key = `${scope}:${ip}`, now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 600_000);
  list.push(now); hits.set(key, list);
  return list.length > 10;
}
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 160;

/** Step 1: email → we send a 6-digit code. Always answers the same, so the form never reveals who is a client. */
export async function requestCodeAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim();
  if (!validEmail(email)) return { step: "email", email, error: "That email doesn't look right." };
  if (await limited("code")) return { step: "email", email, error: "Too many tries. Wait a few minutes, or ask the studio for a login link." };
  const c = await getClientByEmail(email);
  if (c && c.portal_enabled) {
    const code = await issueLoginCode(c.id);
    if (code) await sendLoginCode(c, code);
  }
  return { step: "code", email, note: `If ${email} has a portal, a 6-digit code is on its way. It works for 15 minutes.` };
}

/** Step 2: the code. */
export async function verifyCodeAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim();
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (await limited("verify")) return { step: "code", email, error: "Too many tries. Wait a few minutes, or ask the studio for a login link." };
  const c = await verifyLoginCode(email, code);
  if (!c) return { step: "code", email, error: "That code didn't work. Check it, or send a new one." };
  await startClientSession(c.id);
  redirect("/portal");
}

export async function passwordLoginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim();
  const pw = String(fd.get("password") ?? "");
  if (await limited("pw")) return { step: "email", email, error: "Too many tries. Wait a few minutes, or use a code." };
  const c = validEmail(email) && pw ? await verifyPasswordLogin(email, pw) : null;
  if (!c) return { step: "email", email, error: "Email or password didn't match. You can log in with a code instead." };
  await startClientSession(c.id);
  redirect("/portal");
}

export async function logoutClientAction() {
  await endClientSession();
  redirect("/portal/login");
}

export type PwState = { ok?: boolean; error?: string } | null;
export async function setPasswordAction(_prev: PwState, fd: FormData): Promise<PwState> {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const pw = String(fd.get("password") ?? ""), again = String(fd.get("again") ?? ""), old = String(fd.get("current") ?? "");
  if (fd.get("remove") === "1") { await setClientPassword(c.id, null); revalidatePath("/portal/account"); return { ok: true }; }
  if (pw.length < 8) return { error: "Use at least 8 characters." };
  if (pw !== again) return { error: "The two passwords don't match." };
  if (c.has_password) {
    const full = await getClientByEmail(c.email);
    if (!full?.password_hash || !(await checkPassword(old, full.password_hash))) return { error: "Your current password isn't right." };
  }
  await setClientPassword(c.id, pw);
  revalidatePath("/portal/account");
  return { ok: true };
}

/** The client's own project, or null — every write checks ownership through this. */
async function ownProject(projectId: string) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const p = await getProject(projectId);
  return p && p.client_id === c.id ? { c, p } : null;
}

async function fileFrom(fd: FormData, key = "file"): Promise<{ name: string; mime: string; data: Buffer } | "too-big" | null> {
  const f = fd.get(key);
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > FILE_MAX_BYTES) return "too-big";
  return { name: f.name || "file", mime: f.type || "application/octet-stream", data: Buffer.from(await f.arrayBuffer()) };
}

export type PostState = { ok?: boolean; error?: string; at?: number } | null;

export async function sendMessageAction(_prev: PostState, fd: FormData): Promise<PostState> {
  const own = await ownProject(String(fd.get("project") ?? ""));
  if (!own) return { error: "That project isn't available." };
  const body = String(fd.get("body") ?? "").trim().slice(0, 4000);
  const file = await fileFrom(fd);
  if (file === "too-big") return { error: "That file is over 7 MB. Share a link to it instead (Google Drive, Dropbox…)." };
  if (!body && !file) return { error: "Write a message or attach a file." };
  const saved = file ? await addFile(own.p.id, { ...file, by: "client" }) : null;
  await addMessage(own.p.id, "client", body || `Sent a file: ${saved!.name}`, saved?.id ?? null);
  await notifyStudio(own.c, own.p, "message", body || `File: ${saved!.name}`);
  revalidatePath(`/portal/p/${own.p.id}`);
  return { ok: true, at: Date.now() };
}

export async function uploadFileAction(_prev: PostState, fd: FormData): Promise<PostState> {
  const own = await ownProject(String(fd.get("project") ?? ""));
  if (!own) return { error: "That project isn't available." };
  const url = String(fd.get("url") ?? "").trim();
  if (url) {
    if (!/^https:\/\/\S+$/i.test(url) || url.length > 1000) return { error: "Links need to start with https://" };
    const name = String(fd.get("name") ?? "").trim() || url.replace(/^https:\/\//, "").slice(0, 60);
    await addLink(own.p.id, name, url, "client");
    await notifyStudio(own.c, own.p, "file", `Link: ${name} — ${url}`);
  } else {
    const file = await fileFrom(fd);
    if (file === "too-big") return { error: "That file is over 7 MB. Add it as a link instead." };
    if (!file) return { error: "Choose a file, or paste a link." };
    const saved = await addFile(own.p.id, { ...file, by: "client" });
    await notifyStudio(own.c, own.p, "file", saved.name);
  }
  revalidatePath(`/portal/p/${own.p.id}`);
  return { ok: true, at: Date.now() };
}
