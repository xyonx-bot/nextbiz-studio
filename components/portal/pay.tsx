"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Bank = { beneficiary: string; accountNumber: string; achRouting: string; wireRouting: string; swift: string; accountType: string; bank: string; bankAddress: string; note: string };
type RzpOpts = Record<string, unknown> & { handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void };
declare global { interface Window { Razorpay?: new (o: RzpOpts) => { open: () => void; on: (e: string, f: (r: { error?: { description?: string } }) => void) => void } } }

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((ok) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => ok(true); s.onerror = () => ok(false);
    document.body.appendChild(s);
  });
}
const post = (id: string, body: unknown) =>
  fetch(`/api/portal/pay/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ ok: false, error: "Network hiccup. Try again." }));

function Copy({ v }: { v: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="pui-copy" onClick={async () => {
      try { await navigator.clipboard.writeText(v); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* old browsers: the value is selectable */ }
    }}>{done ? "Copied" : "Copy"}</button>
  );
}

/**
 * The pay options for ONE requested payment.
 * INR → Pay now (Razorpay Checkout: UPI, cards, netbanking) · Show UPI QR (scan with any UPI app; confirms itself).
 * USD → bank transfer details (ACH / Fedwire / SWIFT) with the reference to quote; the studio confirms it.
 */
export function PayBox({ id, currency, amountLabel, reference, online, bank, inrNote }: {
  id: string; currency: "INR" | "USD"; amountLabel: string; reference: string; online: boolean; bank: Bank; inrNote: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "busy" | "qr" | "paid">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<{ image: string; closesAt: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [usdTab, setUsdTab] = useState<"us" | "swift">("us");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const done = useCallback(() => {
    if (poll.current) clearInterval(poll.current);
    setMode("paid"); setQr(null);
    setTimeout(() => router.refresh(), 1600);
  }, [router]);

  const check = useCallback(async () => {
    const r = await fetch(`/api/portal/pay/${id}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r?.status === "paid") done();
    return r?.status;
  }, [id, done]);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.round((qr.closesAt - Date.now()) / 1000))), 1000);
    setLeft(Math.max(0, Math.round((qr.closesAt - Date.now()) / 1000)));
    return () => clearInterval(t);
  }, [qr]);

  async function payNow() {
    setErr(null); setMode("busy");
    const [loaded, o] = await Promise.all([loadCheckout(), post(id, { action: "order" })]);
    if (!o.ok) { setErr(o.error); setMode("idle"); return; }
    if (!loaded || !window.Razorpay) { setErr("The payment window couldn't load. Check your connection, or use the UPI QR."); setMode("idle"); return; }
    const rz = new window.Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency, name: "NextBiz Studio", description: o.description,
      image: `${location.origin}/brand/nb-logo-web.png`, prefill: o.prefill, theme: { color: "#0F1115" },
      modal: { ondismiss: () => { setMode("idle"); void check(); } },
      handler: async (r) => {
        setMode("busy");
        const v = await post(id, { action: "verify", ...r });
        if (v.ok) done(); else { setErr(v.error); setMode("idle"); }
      },
    });
    rz.on("payment.failed", (r) => setErr(r.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. No money was taken. Try again."));
    rz.open();
  }

  async function showQr() {
    setErr(null); setMode("busy");
    const q = await post(id, { action: "qr" });
    if (!q.ok) { setErr(q.error); setMode("idle"); return; }
    setQr({ image: q.image, closesAt: q.closesAt }); setMode("qr");
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(() => { void check(); }, 4000);
  }

  if (mode === "paid") return <div className="pui-paid" role="status"><b>✓ Payment received.</b> Thank you! Your receipt is on its way.</div>;

  if (currency === "USD") {
    const rows: [string, string][] = usdTab === "us"
      ? [["Beneficiary", bank.beneficiary], ["Account number", bank.accountNumber], ["ACH routing", bank.achRouting], ["Wire (Fedwire / ABA) routing", bank.wireRouting], ["Account type", bank.accountType], ["Bank", bank.bank], ["Bank address", bank.bankAddress]]
      : [["Beneficiary", bank.beneficiary], ["Account number", bank.accountNumber], ["SWIFT / BIC", bank.swift], ["Bank", bank.bank], ["Bank address", bank.bankAddress]];
    if (!bank.accountNumber) return <p className="ca-sub">Bank details are on their way. Message us in the portal and we&apos;ll share them.</p>;
    return (
      <div className="pui-bank">
        <div className="pui-seg" role="tablist" aria-label="Where you're paying from">
          <button type="button" role="tab" aria-selected={usdTab === "us"} className={usdTab === "us" ? "on" : ""} onClick={() => setUsdTab("us")}>From a US bank</button>
          <button type="button" role="tab" aria-selected={usdTab === "swift"} className={usdTab === "swift" ? "on" : ""} onClick={() => setUsdTab("swift")}>From outside the US (SWIFT)</button>
        </div>
        <ul className="ca-kv">
          <li className="pui-ref"><span>Amount</span><b>{amountLabel} <Copy v={amountLabel.replace(/[^0-9.]/g, "")} /></b></li>
          <li className="pui-ref"><span>Reference (put this in the transfer note)</span><b className="pay-mono">{reference} <Copy v={reference} /></b></li>
          {rows.filter(([, v]) => v).map(([k, v]) => <li key={k}><span>{k}</span><b>{v} <Copy v={v} /></b></li>)}
        </ul>
        {bank.note && <p className="ca-sub">{bank.note}</p>}
        <p className="ca-sub">Once you&apos;ve sent it, drop us a line in Messages. We mark it paid as soon as it lands (usually 1–3 working days).</p>
      </div>
    );
  }

  return (
    <div className="pui-paybox">
      {!online ? (
        <p className="ca-sub">Online payment is being switched on. Message us and we&apos;ll share our UPI details in the meantime.</p>
      ) : mode === "qr" && qr ? (
        <div className="pui-qr">
          <img src={qr.image} alt={`UPI QR code for ${amountLabel}`} />
          <div className="pui-qrtxt">
            <b>Scan with any UPI app</b>
            <span>GPay, PhonePe, Paytm, BHIM or your bank&apos;s app. The amount ({amountLabel}) is filled in for you.</span>
            <span className="pui-wait"><i aria-hidden /> Waiting for your payment… {left > 0 ? `QR works for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "This QR has expired."}</span>
            <div className="ca-row">
              <button type="button" className="ca-btn" onClick={() => { void check(); }}>I&apos;ve paid, check now</button>
              {left === 0 && <button type="button" className="ca-btn" onClick={showQr}>New QR</button>}
              <button type="button" className="ca-x" onClick={() => { if (poll.current) clearInterval(poll.current); setQr(null); setMode("idle"); }}>Close</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ca-row">
          <button type="button" className="ca-btn pri pui-paybtn" onClick={payNow} disabled={mode === "busy"}>{mode === "busy" ? "Opening…" : `Pay ${amountLabel}`}</button>
          <button type="button" className="ca-btn" onClick={showQr} disabled={mode === "busy"}>Show UPI QR</button>
          <span className="pui-hint">UPI · cards · netbanking · secured by Razorpay</span>
        </div>
      )}
      {inrNote && <p className="ca-sub">{inrNote}</p>}
      {err && <p className="ca-err" role="alert">{err}</p>}
    </div>
  );
}
