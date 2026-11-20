"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { addSystemNote, getLead, moveLeadStatus } from "@/lib/db";
import {
  FILE_MAX_BYTES, addFile, addLink, addMessage, addMilestone, addRequest, addUpdate, createClient, createProject,
  deleteFile, deleteMilestone, deleteRequest, deleteUpdate, getClient, getClientByEmail, getProject, isStage,
  issueLoginLink, markInvited, setMilestoneDone, setPortalEnabled, setRequestDone, siteUrl, updateClient, updateProject,
} from "@/lib/portal";
import { notifyClient, sendInvite } from "@/lib/portal-notify";
import {
  cancelPayment, createPayment, deletePayment, getPayment, isCurrency, listPayments, reopenPayment, savePaymentSettings, setProjectValue,
  stageBlockedBy, toMinor, money, PAYMENT_DEFAULTS, type PaymentSettings,
} from "@/lib/payments";
import { announceRequest, confirmPayment } from "@/lib/payment-events";

async function guard() { if (!(await isAuthenticated())) redirect("/admin/login"); }
const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 160;
const day = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export type FormState = { error?: string; ok?: string; link?: string; at?: number } | null;

/** New client (by hand, or from a lead) + their first project, and optionally the invite email. */
export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const name = s(fd, "name", 120), email = s(fd, "email", 160), title = s(fd, "project", 160);
  if (name.length < 2) return { error: "Add the client's name." };
  if (!validEmail(email)) return { error: "Add a valid login email — the client logs in with it." };
  if (!title) return { error: "Name the first project (you can rename it later)." };
  if (await getClientByEmail(email)) return { error: "A client with that email already exists." };
  const leadId = s(fd, "lead", 40) || null;
  const lead = leadId ? await getLead(leadId) : null;
  const c = await createClient({ name, email, business: s(fd, "business", 120), phone: s(fd, "phone", 30), leadId: lead?.id ?? null });
  const plan = lead && fd.get("copyPlan") === "on" ? (lead as unknown as { plan?: unknown }).plan ?? null : null;
  const summary = lead && fd.get("copyPlan") === "on" ? lead.message.slice(0, 1500) : null;
  const p = await createProject(c.id, title, plan, summary);
  if (lead) {
    await addSystemNote(lead.id, `Became a client — ${title}`).catch(() => {});
    if (lead.status !== "won") await moveLeadStatus(lead.id, "won").catch(() => {});
  }
  if (fd.get("invite") === "on") {
    const token = await issueLoginLink(c.id, 24 * 7);
    await sendInvite(c, token, p.title);
    await markInvited(c.id);
  }
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${c.id}?created=1`);
}

export async function updateClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const id = s(fd, "id", 40), name = s(fd, "name", 120), email = s(fd, "email", 160);
  if (name.length < 2 || !validEmail(email)) return { error: "Name and a valid email are needed." };
  const other = await getClientByEmail(email);
  if (other && other.id !== id) return { error: "Another client already uses that email." };
  await updateClient(id, { name, email, business: s(fd, "business", 120), phone: s(fd, "phone", 30) });
  revalidatePath(`/admin/clients/${id}`);
  return { ok: "Saved.", at: Date.now() };
}

/** Email the invite again (a fresh 7-day link). */
export async function sendInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const c = await getClient(s(fd, "id", 40));
  if (!c) return { error: "Client not found." };
  if (!c.portal_enabled) return { error: "Portal access is off for this client. Turn it on first." };
  const token = await issueLoginLink(c.id, 24 * 7);
  const r = await sendInvite(c, token);
  await markInvited(c.id);
  revalidatePath(`/admin/clients/${c.id}`);
  return r.ok ? { ok: `Invite sent to ${c.email}.`, at: Date.now() } : { error: `The email didn't go out (${"error" in r ? r.error : "unknown"}). Copy a login link instead and send it on WhatsApp.` };
}

/** A one-time login link (24 hours) to send yourself — works even if email is down. */
export async function copyLinkAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const c = await getClient(s(fd, "id", 40));
  if (!c) return { error: "Client not found." };
  if (!c.portal_enabled) return { error: "Portal access is off for this client. Turn it on first." };
  const token = await issueLoginLink(c.id, 24);
  return { link: `${await siteUrl()}/portal/l/${token}`, ok: "Link ready — it works once, for 24 hours.", at: Date.now() };
}

export async function setAccessAction(fd: FormData) {
  await guard();
  const id = s(fd, "id", 40);
  await setPortalEnabled(id, fd.get("on") === "1");
  revalidatePath(`/admin/clients/${id}`);
}

export async function addProjectAction(fd: FormData) {
  await guard();
  const c = await getClient(s(fd, "id", 40));
  const title = s(fd, "title", 160);
  if (!c || !title) return;
  const p = await createProject(c.id, title);
  redirect(`/admin/clients/${c.id}/p/${p.id}`);
}

/* ── project ── */
async function proj(fd: FormData) {
  await guard();
  const p = await getProject(s(fd, "project", 40));
  if (!p) throw new Error("Project not found");
  const c = await getClient(p.client_id);
  if (!c) throw new Error("Client not found");
  return { p, c, path: `/admin/clients/${c.id}/p/${p.id}` };
}
async function fileFrom(fd: FormData): Promise<{ name: string; mime: string; data: Buffer } | "too-big" | null> {
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > FILE_MAX_BYTES) return "too-big";
  return { name: f.name || "file", mime: f.type || "application/octet-stream", data: Buffer.from(await f.arrayBuffer()) };
}

export async function setStageAction(fd: FormData) {
  const { p, c, path } = await proj(fd);
  const stage = s(fd, "stage", 20);
  if (!isStage(stage) || stage === p.stage) return;
  // one step at a time — never jump (a stray click once moved a project straight to Care)
  const order = ["plan", "design", "build", "launch", "care"];
  if (Math.abs(order.indexOf(stage) - order.indexOf(p.stage)) !== 1) return;
  // a stage held by an unpaid request can't be entered until it's paid (or the request is cancelled)
  const held = stageBlockedBy(await listPayments(p.id), stage);
  if (held) redirect(`${path}?held=${held.id}`);
  await updateProject(p.id, { stage });
  if (fd.get("notify") === "on") await notifyClient(c, p, "stage", stage);
  revalidatePath(path);
}

export async function saveProjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, path } = await proj(fd);
  const title = s(fd, "title", 160);
  if (!title) return { error: "The project needs a name." };
  await updateProject(p.id, { title, summary: s(fd, "summary", 2000) });
  revalidatePath(path);
  return { ok: "Saved.", at: Date.now() };
}

export async function postUpdateAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, c, path } = await proj(fd);
  const body = s(fd, "body", 4000);
  const file = await fileFrom(fd);
  if (file === "too-big") return { error: "That file is over 7 MB. Share a link instead." };
  if (!body) return { error: "Write the update first." };
  const saved = file ? await addFile(p.id, { ...file, by: "studio" }) : null;
  await addUpdate(p.id, body, saved?.id ?? null);
  if (fd.get("notify") === "on") await notifyClient(c, p, "update", body);
  revalidatePath(path);
  return { ok: "Posted.", at: Date.now() };
}

export async function replyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, c, path } = await proj(fd);
  const body = s(fd, "body", 4000);
  const file = await fileFrom(fd);
  if (file === "too-big") return { error: "That file is over 7 MB. Share a link instead." };
  if (!body && !file) return { error: "Write a reply or attach a file." };
  const saved = file ? await addFile(p.id, { ...file, by: "studio" }) : null;
  await addMessage(p.id, "studio", body || `Sent a file: ${saved!.name}`, saved?.id ?? null);
  await notifyClient(c, p, "message", body || `File: ${saved!.name}`);
  revalidatePath(path);
  return { ok: "Sent.", at: Date.now() };
}

export async function addFileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, c, path } = await proj(fd);
  const url = s(fd, "url", 1000);
  let name = "";
  if (url) {
    if (!/^https:\/\/\S+$/i.test(url)) return { error: "Links need to start with https://" };
    name = s(fd, "name", 200) || url.replace(/^https:\/\//, "").slice(0, 60);
    await addLink(p.id, name, url, "studio");
  } else {
    const file = await fileFrom(fd);
    if (file === "too-big") return { error: "That file is over 7 MB. Add it as a link instead." };
    if (!file) return { error: "Choose a file, or paste a link." };
    name = (await addFile(p.id, { ...file, by: "studio" })).name;
  }
  if (fd.get("notify") === "on") await notifyClient(c, p, "file", name);
  revalidatePath(path);
  return { ok: "Added.", at: Date.now() };
}

export async function milestoneAction(fd: FormData) {
  const { p, path } = await proj(fd);
  const op = s(fd, "op", 10), id = s(fd, "id", 40);
  if (op === "add" && s(fd, "title")) await addMilestone(p.id, s(fd, "title"), day(s(fd, "due", 10)));
  if (op === "done" || op === "undo") await setMilestoneDone(id, p.id, op === "done");
  if (op === "del") await deleteMilestone(id, p.id);
  revalidatePath(path);
}

export async function requestAction(fd: FormData) {
  const { p, c, path } = await proj(fd);
  const op = s(fd, "op", 10), id = s(fd, "id", 40);
  if (op === "add" && s(fd, "title")) {
    await addRequest(p.id, s(fd, "title"), day(s(fd, "due", 10)));
    if (fd.get("notify") === "on") await notifyClient(c, p, "request", s(fd, "title"));
  }
  if (op === "done" || op === "undo") await setRequestDone(id, p.id, op === "done");
  if (op === "del") await deleteRequest(id, p.id);
  revalidatePath(path);
}

export async function deleteThingAction(fd: FormData) {
  const { p, path } = await proj(fd);
  const what = s(fd, "what", 10), id = s(fd, "id", 40);
  if (what === "file") await deleteFile(id, p.id);
  if (what === "update") await deleteUpdate(id, p.id);
  revalidatePath(path);
}

/* ── payments ── */
const STAGE_IDS = ["plan", "design", "build", "launch", "care"] as const;

/** Ask the client for an amount. Any amount, any time; optionally holds a stage until paid. */
export async function requestPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, path } = await proj(fd);
  const label = s(fd, "label", 120), cur = s(fd, "currency", 3), amount = toMinor(s(fd, "amount", 20));
  if (!label) return { error: "Say what the payment is for, e.g. Advance." };
  if (!amount) return { error: "Enter an amount, e.g. 15000." };
  if (!isCurrency(cur)) return { error: "Pick INR or USD." };
  const blocks = s(fd, "blocks", 20);
  const pay = await createPayment({
    projectId: p.id, label, amount, currency: cur, note: s(fd, "note", 600) || null, dueOn: day(s(fd, "due", 10)),
    blocksStage: (STAGE_IDS as readonly string[]).includes(blocks) ? (blocks as (typeof STAGE_IDS)[number]) : null,
  });
  await announceRequest(pay, fd.get("notify") === "on");
  revalidatePath(path);
  revalidatePath("/admin/payments");
  return { ok: `Requested ${money(amount, cur)}.`, at: Date.now() };
}

/** Log money received outside the portal (bank transfer, cash, direct UPI). */
export async function recordPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, path } = await proj(fd);
  const label = s(fd, "label", 120) || "Payment", cur = s(fd, "currency", 3), amount = toMinor(s(fd, "amount", 20));
  if (!amount) return { error: "Enter the amount you received." };
  if (!isCurrency(cur)) return { error: "Pick INR or USD." };
  await createPayment({ projectId: p.id, label, amount, currency: cur, kind: "record", via: s(fd, "via", 20) || "other", ref: s(fd, "ref", 120) || null, paidOn: day(s(fd, "on", 10)) });
  revalidatePath(path);
  return { ok: `Logged ${money(amount, cur)} received.`, at: Date.now() };
}

/** Row actions: mark paid (with how + reference), cancel, undo a manual "paid", delete. */
export async function paymentOpAction(fd: FormData) {
  const { p, path } = await proj(fd);
  const pay = await getPayment(s(fd, "id", 40));
  if (!pay || pay.project_id !== p.id) return;
  const op = s(fd, "op", 10);
  if (op === "paid") await confirmPayment(pay.id, { via: s(fd, "via", 20) || "bank", ref: s(fd, "ref", 120) || null, paidOn: day(s(fd, "on", 10)), ping: false, receipt: fd.get("receipt") === "on" });
  if (op === "cancel") await cancelPayment(pay.id, p.id);
  if (op === "reopen") await reopenPayment(pay.id, p.id);
  if (op === "delete") await deletePayment(pay.id, p.id);
  revalidatePath(path);
}

export async function projectValueAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { p, path } = await proj(fd);
  const raw = s(fd, "value", 20), cur = s(fd, "currency", 3);
  if (!isCurrency(cur)) return { error: "Pick INR or USD." };
  const amount = raw ? toMinor(raw) : null;
  if (raw && !amount) return { error: "Enter a number, e.g. 40000, or leave it empty." };
  await setProjectValue(p.id, amount, cur);
  revalidatePath(path);
  return { ok: amount ? `Project value set to ${money(amount, cur)}.` : "Project value cleared.", at: Date.now() };
}

export async function savePaymentSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await guard();
  const b = PAYMENT_DEFAULTS.usdBank;
  const next: PaymentSettings = {
    usdBank: Object.fromEntries(Object.keys(b).map((k) => [k, s(fd, `usd_${k}`, k === "note" ? 400 : 160)])) as PaymentSettings["usdBank"],
    inrNote: s(fd, "inrNote", 400),
  };
  await savePaymentSettings(next);
  revalidatePath("/admin/payments");
  return { ok: "Saved.", at: Date.now() };
}
