/**
 * What happens around a payment — shared by the portal (Razorpay), the webhook and the admin.
 * Nothing here throws: a failed email/ping never undoes a payment.
 */
import { addMessage, getClient, getProject } from "./portal";
import { markPaid, money, payRef, VIA_LABEL, type Payment } from "./payments";
import { notifyClient, notifyStudio } from "./portal-notify";

/** A new request: a line in the project chat + an email to the client. */
export async function announceRequest(pay: Payment, notify: boolean) {
  const p = await getProject(pay.project_id);
  if (!p) return;
  const c = await getClient(p.client_id);
  const due = pay.due_on ? ` Due by ${new Date(`${pay.due_on}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.` : "";
  const line = `Payment request: ${pay.label} · ${money(pay.amount, pay.currency)}.${due} You can pay from the Payments tab.${pay.note ? `\n${pay.note}` : ""}`;
  await addMessage(p.id, "studio", line, null).catch(() => {});
  if (notify && c) await notifyClient(c, p, "payment", `We've requested ${money(pay.amount, pay.currency)} for “${pay.label}”.${due}${pay.note ? `\n\n${pay.note}` : ""}\n\nReference: ${payRef(pay)}`).catch(() => {});
}

/** Mark paid (idempotent) and, the first time only: chat line, studio ping, client receipt. */
export async function confirmPayment(paymentId: string, how: { via: string; ref?: string | null; rzpPaymentId?: string | null; paidOn?: string | null; receipt?: boolean; ping?: boolean }) {
  const pay = await markPaid(paymentId, how);
  if (!pay) return null; // already paid (webhook + checkout both arrive) — nothing to repeat
  const p = await getProject(pay.project_id);
  const c = p ? await getClient(p.client_id) : null;
  if (p && c) {
    const amt = money(pay.amount, pay.currency);
    const via = VIA_LABEL[pay.paid_via ?? ""] ?? pay.paid_via ?? "";
    await addMessage(p.id, "studio", `Payment received: ${pay.label} · ${amt}${via ? ` via ${via}` : ""}. Thank you!`, null).catch(() => {});
    if (how.ping !== false) await notifyStudio(c, p, "payment", `${amt} for “${pay.label}”${via ? ` via ${via}` : ""}${pay.paid_ref ? ` (ref ${pay.paid_ref})` : ""}`).catch(() => {});
    if (how.receipt !== false) await notifyClient(c, p, "receipt", `We've received ${amt} for “${pay.label}” on ${p.title}.${pay.paid_ref ? `\nPayment reference: ${pay.paid_ref}` : ""}`).catch(() => {});
  }
  return pay;
}
