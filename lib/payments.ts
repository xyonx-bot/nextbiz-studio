/**
 * Project payments (db/migrations/011-payments.sql) + Razorpay.
 *
 * The studio REQUESTS an amount (any amount, any time) — clients never get a generic pay link.
 * A request can block a stage: the project can't move into that stage until it's paid.
 * Money comes in three ways:
 *   1. Razorpay Checkout (UPI / cards / netbanking) — verified by signature, then by webhook
 *   2. a Razorpay UPI QR for the exact amount — confirmed by webhook or by polling the QR
 *   3. outside the portal (USD bank transfer via Xflow, cash, direct UPI) — the studio marks it paid
 * Razorpay keys live only in the server env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPool } from "./db";
import { STAGES, type Stage } from "./portal";

export type Currency = "INR" | "USD";
export const CURRENCIES: Currency[] = ["INR", "USD"];
export const isCurrency = (v: string): v is Currency => v === "INR" || v === "USD";

export interface Payment {
  id: string; project_id: string; label: string; amount: number; currency: Currency; note: string | null;
  due_on: string | null; blocks_stage: Stage | null; status: "requested" | "paid" | "cancelled"; kind: "request" | "record";
  paid_at: string | null; paid_via: string | null; paid_ref: string | null;
  rzp_order_id: string | null; rzp_qr_id: string | null; rzp_payment_id: string | null; created_at: string;
}

const COLS = `id, project_id, label, amount::float8 AS amount, currency, note, to_char(due_on, 'YYYY-MM-DD') AS due_on, blocks_stage,
  status, kind, paid_at, paid_via, paid_ref, rzp_order_id, rzp_qr_id, rzp_payment_id, created_at`;

/* ── money formatting ── */
export const toMinor = (major: string) => {
  const n = Number(String(major).replace(/[,\s₹$]/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1e8 ? Math.round(n * 100) : null;
};
export function money(minor: number, cur: Currency | string = "INR") {
  const v = minor / 100;
  const whole = Number.isInteger(v);
  return cur === "USD"
    ? `$${v.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
    : `₹${v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
export const isOverdue = (p: Pick<Payment, "status" | "due_on">) =>
  p.status === "requested" && !!p.due_on && p.due_on < new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
/** Short reference the client quotes on a bank transfer, e.g. NBS-3F7B2A. */
export const payRef = (p: Pick<Payment, "id">) => `NBS-${p.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
export const VIA_LABEL: Record<string, string> = { razorpay: "Razorpay", upi: "UPI", bank: "Bank transfer", cash: "Cash", other: "Other" };

/* ── queries ── */
export async function listPayments(projectId: string): Promise<Payment[]> {
  const { rows } = await getPool().query(`SELECT ${COLS} FROM project_payments WHERE project_id = $1 ORDER BY created_at`, [projectId]);
  return rows;
}
export async function getPayment(id: string): Promise<Payment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await getPool().query(`SELECT ${COLS} FROM project_payments WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
export async function listAllPayments(limit = 300): Promise<(Payment & { project_title: string; client_id: string; client_name: string })[]> {
  const { rows } = await getPool().query(
    `SELECT pp.*, p.title AS project_title, c.id AS client_id, c.name AS client_name
       FROM (SELECT ${COLS} FROM project_payments) pp JOIN client_projects p ON p.id = pp.project_id JOIN clients c ON c.id = p.client_id
      ORDER BY (pp.status = 'requested') DESC, pp.created_at DESC LIMIT $1`, [limit]);
  return rows;
}
/** Requested-and-unpaid count per client project (portal badge + admin list). */
export async function countDue(projectId: string): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM project_payments WHERE project_id = $1 AND status = 'requested'`, [projectId]);
  return rows[0]?.n ?? 0;
}

export async function createPayment(input: {
  projectId: string; label: string; amount: number; currency: Currency; note?: string | null; dueOn?: string | null;
  blocksStage?: Stage | null; kind?: "request" | "record"; via?: string | null; ref?: string | null; paidOn?: string | null;
}): Promise<Payment> {
  const record = input.kind === "record";
  const { rows } = await getPool().query(
    `INSERT INTO project_payments (project_id, label, amount, currency, note, due_on, blocks_stage, kind, status, paid_at, paid_via, paid_ref)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [input.projectId, input.label, input.amount, input.currency, input.note || null, input.dueOn || null, record ? null : input.blocksStage || null,
      record ? "record" : "request", record ? "paid" : "requested",
      record ? (input.paidOn ? `${input.paidOn}T12:00:00+05:30` : new Date().toISOString()) : null, record ? input.via || "other" : null, record ? input.ref || null : null]);
  return (await getPayment(rows[0].id))!;
}
export async function cancelPayment(id: string, projectId: string) {
  await getPool().query(`UPDATE project_payments SET status = 'cancelled', updated_at = now() WHERE id = $1 AND project_id = $2 AND status = 'requested'`, [id, projectId]);
}
export async function deletePayment(id: string, projectId: string) {
  // cancelled requests and hand-logged records can be removed; a paid request stays as history
  await getPool().query(`DELETE FROM project_payments WHERE id = $1 AND project_id = $2 AND (status = 'cancelled' OR kind = 'record')`, [id, projectId]);
}
/** Undo a manual "mark paid" (typo, wrong row). Razorpay-confirmed payments can't be undone here. */
export async function reopenPayment(id: string, projectId: string) {
  await getPool().query(
    `UPDATE project_payments SET status = 'requested', paid_at = NULL, paid_via = NULL, paid_ref = NULL, updated_at = now()
      WHERE id = $1 AND project_id = $2 AND status = 'paid' AND kind = 'request' AND rzp_payment_id IS NULL`, [id, projectId]);
}
export async function setRzpRefs(id: string, refs: { order?: string; qr?: string }) {
  await getPool().query(`UPDATE project_payments SET rzp_order_id = COALESCE($2, rzp_order_id), rzp_qr_id = COALESCE($3, rzp_qr_id), updated_at = now() WHERE id = $1`,
    [id, refs.order ?? null, refs.qr ?? null]);
}

/**
 * Mark a request paid. Idempotent: returns the row only the FIRST time (so receipts/pings fire once).
 */
export async function markPaid(id: string, how: { via: string; ref?: string | null; rzpPaymentId?: string | null; paidOn?: string | null }): Promise<Payment | null> {
  const { rows } = await getPool().query(
    `UPDATE project_payments SET status = 'paid', paid_at = $2, paid_via = $3, paid_ref = $4, rzp_payment_id = COALESCE($5, rzp_payment_id), updated_at = now()
      WHERE id = $1 AND status = 'requested' RETURNING id`,
    [id, how.paidOn ? `${how.paidOn}T12:00:00+05:30` : new Date().toISOString(), how.via, how.ref ?? how.rzpPaymentId ?? null, how.rzpPaymentId ?? null]);
  return rows[0] ? getPayment(rows[0].id) : null;
}
export async function findByRzp(ref: { order?: string | null; qr?: string | null }): Promise<Payment | null> {
  if (ref.order) { const { rows } = await getPool().query(`SELECT ${COLS} FROM project_payments WHERE rzp_order_id = $1`, [ref.order]); if (rows[0]) return rows[0]; }
  if (ref.qr) { const { rows } = await getPool().query(`SELECT ${COLS} FROM project_payments WHERE rzp_qr_id = $1`, [ref.qr]); if (rows[0]) return rows[0]; }
  return null;
}

export async function setProjectValue(projectId: string, amount: number | null, currency: Currency) {
  await getPool().query(`UPDATE client_projects SET value_amount = $2, value_currency = $3, updated_at = now() WHERE id = $1`, [projectId, amount, currency]);
}

/* ── the money summary, per currency ── */
export interface Totals { currency: Currency; value: number | null; requested: number; paid: number; due: number; overdue: number }
export function totals(payments: Payment[], project: { value_amount?: string | number | null; value_currency?: string }): Totals[] {
  const vc = (isCurrency(project.value_currency ?? "") ? project.value_currency : "INR") as Currency;
  const curs = new Set<Currency>(payments.filter((p) => p.status !== "cancelled").map((p) => p.currency));
  if (project.value_amount != null) curs.add(vc);
  if (curs.size === 0) curs.add(vc);
  return [...curs].map((cur) => {
    const rows = payments.filter((p) => p.currency === cur && p.status !== "cancelled");
    const sum = (f: (p: Payment) => boolean) => rows.filter(f).reduce((a, p) => a + Number(p.amount), 0);
    return {
      currency: cur,
      value: cur === vc && project.value_amount != null ? Number(project.value_amount) : null,
      requested: sum((p) => p.kind === "request"),
      paid: sum((p) => p.status === "paid"),
      due: sum((p) => p.status === "requested"),
      overdue: sum((p) => isOverdue(p)),
    };
  });
}

/** The earliest stage an unpaid request is holding back, if any. */
export function blockingPayment(payments: Payment[]): Payment | null {
  const order = (s: string | null) => STAGES.findIndex((x) => x.id === s);
  return payments.filter((p) => p.status === "requested" && p.blocks_stage).sort((a, b) => order(a.blocks_stage) - order(b.blocks_stage))[0] ?? null;
}
/** Can the project move into `stage`? Not while an unpaid request blocks that stage or an earlier one. */
export function stageBlockedBy(payments: Payment[], stage: Stage): Payment | null {
  const idx = STAGES.findIndex((x) => x.id === stage);
  return payments.find((p) => p.status === "requested" && p.blocks_stage && STAGES.findIndex((x) => x.id === p.blocks_stage) <= idx) ?? null;
}

/* ── payment settings (Admin → Payments) ── */
export interface PaymentSettings {
  usdBank: { beneficiary: string; accountNumber: string; achRouting: string; wireRouting: string; swift: string; accountType: string; bank: string; bankAddress: string; note: string };
  inrNote: string;              // shown under the INR options, e.g. "GST invoice not applicable"
}
export const PAYMENT_DEFAULTS: PaymentSettings = {
  usdBank: { beneficiary: "", accountNumber: "", achRouting: "", wireRouting: "", swift: "", accountType: "Business", bank: "", bankAddress: "", note: "From a US bank: ACH or a domestic wire (Fedwire). From outside the US: an international SWIFT transfer. Put the reference in the transfer note so we can match it." },
  inrNote: "",
};
export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { rows } = await getPool().query<{ value: Partial<PaymentSettings> }>(`SELECT value FROM app_settings WHERE key = 'payments'`);
    const v = rows[0]?.value ?? {};
    return { usdBank: { ...PAYMENT_DEFAULTS.usdBank, ...(v.usdBank ?? {}) }, inrNote: typeof v.inrNote === "string" ? v.inrNote : "" };
  } catch { return PAYMENT_DEFAULTS; }
}
export async function savePaymentSettings(next: PaymentSettings) {
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('payments', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(next)]);
}

/* ── Razorpay (REST, no SDK) ── */
export const rzpKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";
export const rzpOn = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const rzpTestMode = () => rzpKeyId().startsWith("rzp_test_");

async function rzp<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method, headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`razorpay ${path}: ${res.status} ${(data as { error?: { description?: string } })?.error?.description ?? ""}`.trim());
  return data as T;
}

export async function rzpCreateOrder(p: Payment, projectTitle: string) {
  return rzp<{ id: string; amount: number; currency: string; status: string }>("POST", "/orders", {
    amount: Number(p.amount), currency: p.currency, receipt: payRef(p),
    notes: { payment_id: p.id, project_id: p.project_id, label: p.label.slice(0, 200), project: projectTitle.slice(0, 200) },
  });
}
/** Single-use UPI QR for the exact amount (INR only). Closes itself after 30 minutes. */
export async function rzpCreateQr(p: Payment, name: string) {
  return rzp<{ id: string; image_url: string; status: string; close_by: number }>("POST", "/payments/qr_codes", {
    type: "upi_qr", name: name.slice(0, 40) || "NextBiz Studio", usage: "single_use", fixed_amount: true, payment_amount: Number(p.amount),
    description: `${payRef(p)} · ${p.label}`.slice(0, 100), close_by: Math.floor(Date.now() / 1000) + 30 * 60,
    notes: { payment_id: p.id, project_id: p.project_id },
  });
}
export async function rzpCloseQr(id: string) { await rzp("POST", `/payments/qr_codes/${id}/close`).catch(() => {}); }

type RzpPay = { id: string; status: string; amount: number; method?: string; vpa?: string };
/** Captured payment for an order or QR, if one exists (used when no webhook has arrived yet). */
export async function rzpFindCaptured(p: Payment): Promise<RzpPay | null> {
  const lists: RzpPay[] = [];
  if (p.rzp_order_id) lists.push(...(await rzp<{ items: RzpPay[] }>("GET", `/orders/${p.rzp_order_id}/payments`).catch(() => ({ items: [] }))).items);
  if (p.rzp_qr_id) lists.push(...(await rzp<{ items: RzpPay[] }>("GET", `/payments/qr_codes/${p.rzp_qr_id}/payments`).catch(() => ({ items: [] }))).items);
  return lists.find((x) => x.status === "captured" && Number(x.amount) >= Number(p.amount)) ?? null;
}
/** Checkout returns order_id|payment_id signed with the key secret. */
export function rzpCheckSignature(orderId: string, paymentId: string, signature: string) {
  const want = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`${orderId}|${paymentId}`).digest("hex");
  return safeEq(want, signature);
}
export function rzpCheckWebhook(raw: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEq(createHmac("sha256", secret).update(raw).digest("hex"), signature);
}
function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
}
