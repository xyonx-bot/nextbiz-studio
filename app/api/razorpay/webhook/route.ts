import { NextResponse } from "next/server";
import { findByRzp, getPayment, rzpCheckWebhook } from "@/lib/payments";
import { confirmPayment } from "@/lib/payment-events";

export const dynamic = "force-dynamic";

type Ent = { id?: string; order_id?: string; amount?: number; method?: string; status?: string; notes?: Record<string, string> };

/**
 * POST /api/razorpay/webhook — set in Razorpay → Settings → Webhooks.
 * Events: payment.captured, order.paid, qr_code.credited. Signed with RAZORPAY_WEBHOOK_SECRET.
 * Always 200 for events we don't act on, so Razorpay doesn't keep retrying.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!rzpCheckWebhook(raw, req.headers.get("x-razorpay-signature") ?? "")) return NextResponse.json({ ok: false }, { status: 401 });
  let ev: { event?: string; payload?: { payment?: { entity?: Ent }; order?: { entity?: Ent }; qr_code?: { entity?: Ent } } };
  try { ev = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const pay = ev.payload?.payment?.entity;
  if (!pay?.id || !["payment.captured", "order.paid", "qr_code.credited"].includes(ev.event ?? "")) return NextResponse.json({ ok: true, ignored: true });

  // find our request: by the notes we attach, else by order / QR id
  const noteId = pay.notes?.payment_id ?? ev.payload?.order?.entity?.notes?.payment_id ?? ev.payload?.qr_code?.entity?.notes?.payment_id;
  const row = (noteId ? await getPayment(noteId) : null) ?? (await findByRzp({ order: pay.order_id, qr: ev.payload?.qr_code?.entity?.id }));
  if (!row) return NextResponse.json({ ok: true, unknown: true });
  if (Number(pay.amount) < Number(row.amount)) {
    console.error("[rzp webhook] short payment", pay.id, pay.amount, row.amount);
    return NextResponse.json({ ok: true, short: true });
  }
  await confirmPayment(row.id, { via: pay.method === "upi" ? "upi" : "razorpay", rzpPaymentId: pay.id, ref: pay.id });
  return NextResponse.json({ ok: true });
}
