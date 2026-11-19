import { NextResponse } from "next/server";
import { currentClient, getProject } from "@/lib/portal";
import {
  getPayment, rzpCheckSignature, rzpCloseQr, rzpCreateOrder, rzpCreateQr, rzpFindCaptured, rzpKeyId, rzpOn, setRzpRefs, type Payment,
} from "@/lib/payments";
import { confirmPayment } from "@/lib/payment-events";

export const dynamic = "force-dynamic";

/** The signed-in client's own, still-unpaid request — or an error response. */
async function own(id: string): Promise<{ pay: Payment; title: string; name: string; email: string; phone: string | null } | NextResponse> {
  const c = await currentClient();
  if (!c) return NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });
  const pay = await getPayment(id);
  const p = pay ? await getProject(pay.project_id) : null;
  if (!pay || !p || p.client_id !== c.id) return NextResponse.json({ ok: false, error: "That payment isn't available." }, { status: 404 });
  return { pay, title: p.title, name: c.business || c.name, email: c.email, phone: c.phone };
}

/** If Razorpay already has a captured payment for this request, record it (webhook may be late or not set up). */
async function sync(pay: Payment) {
  if (pay.status !== "requested" || !rzpOn() || (!pay.rzp_order_id && !pay.rzp_qr_id)) return pay.status;
  const got = await rzpFindCaptured(pay).catch(() => null);
  if (!got) return pay.status;
  await confirmPayment(pay.id, { via: got.method === "upi" ? "upi" : "razorpay", rzpPaymentId: got.id, ref: got.id });
  return "paid";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await own((await params).id);
  if (o instanceof NextResponse) return o;
  return NextResponse.json({ ok: true, status: await sync(o.pay) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await own((await params).id);
  if (o instanceof NextResponse) return o;
  const { pay } = o;
  const body = (await req.json().catch(() => ({}))) as { action?: string; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  if (pay.status === "paid") return NextResponse.json({ ok: true, status: "paid" });
  if (pay.status !== "requested") return NextResponse.json({ ok: false, error: "This request was cancelled." }, { status: 409 });
  if (!rzpOn()) return NextResponse.json({ ok: false, error: "Online payment isn't switched on yet. Message us and we'll share another way to pay." }, { status: 503 });

  try {
    if (body.action === "order") {
      // one order per request; reuse it so a client who closes the popup and retries doesn't pile up orders
      let orderId = pay.rzp_order_id;
      if (!orderId) { orderId = (await rzpCreateOrder(pay, o.title)).id; await setRzpRefs(pay.id, { order: orderId }); }
      return NextResponse.json({
        ok: true, keyId: rzpKeyId(), orderId, amount: Number(pay.amount), currency: pay.currency,
        description: `${pay.label} · ${o.title}`.slice(0, 250), prefill: { name: o.name, email: o.email, contact: o.phone ?? "" },
      });
    }
    if (body.action === "verify") {
      const { razorpay_order_id: oid = "", razorpay_payment_id: pid = "", razorpay_signature: sig = "" } = body;
      if (oid !== pay.rzp_order_id || !rzpCheckSignature(oid, pid, sig)) return NextResponse.json({ ok: false, error: "We couldn't confirm that payment. If money left your account, message us and we'll sort it out." }, { status: 400 });
      await confirmPayment(pay.id, { via: "razorpay", rzpPaymentId: pid, ref: pid });
      return NextResponse.json({ ok: true, status: "paid" });
    }
    if (body.action === "qr") {
      if (pay.currency !== "INR") return NextResponse.json({ ok: false, error: "UPI QR works for rupee payments only." }, { status: 400 });
      if (pay.rzp_qr_id) await rzpCloseQr(pay.rzp_qr_id); // one live QR per request
      // the QR Codes product is enabled per account (usually after live activation);
      // until then the client gets Checkout's own UPI QR screen instead
      const qr = await rzpCreateQr(pay, o.name).catch((e: Error) => { console.error("[pay] qr unavailable:", e.message); return null; });
      if (!qr) return NextResponse.json({ ok: false, fallback: "checkout" });
      await setRzpRefs(pay.id, { qr: qr.id });
      return NextResponse.json({ ok: true, image: qr.image_url, closesAt: qr.close_by * 1000 });
    }
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (e) {
    console.error("[pay]", (e as Error).message);
    return NextResponse.json({ ok: false, error: "The payment service didn't respond. Try again in a minute, or message us." }, { status: 502 });
  }
}
