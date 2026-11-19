import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { countUnreadForStudio, siteUrl } from "@/lib/portal";
import { getPaymentSettings, isOverdue, listAllPayments, money, payRef, rzpOn, rzpTestMode, VIA_LABEL, type Currency } from "@/lib/payments";
import { AdminShell } from "@/components/admin/shell";
import { PaymentSettingsForm } from "@/components/admin/payment-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments — Studio Desk | NextBiz Studio" };

const fmtWhen = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function PaymentsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [rows, leads, unread, settings] = await Promise.all([listAllPayments(), countLeads(), countUnreadForStudio(), getPaymentSettings()]);
  const sum = (cur: Currency, f: (r: (typeof rows)[number]) => boolean) => rows.filter((r) => r.currency === cur && f(r)).reduce((a, r) => a + r.amount, 0);
  const curs = (["INR", "USD"] as Currency[]).filter((c) => rows.some((r) => r.currency === c));
  const site = await siteUrl();
  return (
    <AdminShell leadCount={leads} current="payments" clientUnread={unread} crumb="Desk / Payments" title="Payments">
      <div className="content">
        <div className="pay-sums wide">
          {(curs.length ? curs : (["INR"] as Currency[])).map((c) => (
            <dl key={c}>
              <div className="due"><dt>Waiting to be paid · {c}</dt><dd>{money(sum(c, (r) => r.status === "requested"), c)}</dd></div>
              <div><dt>Overdue</dt><dd>{money(sum(c, (r) => isOverdue(r)), c)}</dd></div>
              <div><dt>Received · last 30 days</dt><dd>{money(sum(c, (r) => r.status === "paid" && !!r.paid_at && Date.now() - new Date(r.paid_at).getTime() < 30 * 864e5), c)}</dd></div>
              <div><dt>Received · all time</dt><dd>{money(sum(c, (r) => r.status === "paid"), c)}</dd></div>
            </dl>
          ))}
        </div>

        <section className="ca-card">
          <h2>All payments {rows.length ? <em>{rows.length}</em> : null}</h2>
          {rows.length === 0 ? <p className="ca-sub">No payments yet. Open a client&apos;s project and use <b>Request a payment</b>. Clients only see what you request.</p> : (
            <div className="ca-tablewrap pay-wrap"><table className="ca-table pay-table">
              <thead><tr><th>Client · project</th><th>For</th><th>Amount</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.status === "cancelled" ? "off" : ""}>
                    <td><Link href={`/admin/clients/${r.client_id}/p/${r.project_id}`}><b>{r.client_name}</b></Link><small>{r.project_title}</small></td>
                    <td>{r.label}<small>{payRef(r)}</small></td>
                    <td><b>{money(r.amount, r.currency)}</b></td>
                    <td><span className={`pay-st ${r.status === "paid" ? "paid" : r.status === "cancelled" ? "cancelled" : isOverdue(r) ? "overdue" : "due"}`}>{r.status === "paid" ? "Paid" : r.status === "cancelled" ? "Cancelled" : isOverdue(r) ? "Overdue" : "Requested"}</span></td>
                    <td><small>{r.status === "paid" && r.paid_at ? `${fmtWhen(r.paid_at)} · ${VIA_LABEL[r.paid_via ?? ""] ?? r.paid_via ?? ""}` : `Asked ${fmtWhen(r.created_at)}`}</small></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>

        <div className="ca-grid">
          <section className="ca-card">
            <h2>USD bank transfer details <em>shown to clients on USD requests</em></h2>
            <PaymentSettingsForm s={settings} />
          </section>
          <section className="ca-card">
            <h2>Razorpay</h2>
            <ul className="ca-kv">
              <li><span>Status</span><b>{rzpOn() ? (rzpTestMode() ? "Connected · test mode" : "Connected · live") : "Not connected"}</b></li>
              <li><span>Webhook URL</span><b className="pay-mono">{site}/api/razorpay/webhook</b></li>
              <li><span>Webhook events</span><b>payment.captured, order.paid, qr_code.credited</b></li>
            </ul>
            <p className="ca-sub">Keys live in the server settings only (never in this panel). Rupee requests get <b>Pay now</b> (UPI, cards, netbanking) and <b>Show UPI QR</b>. USD requests show the bank details on the left, and you mark them paid when the money lands in Xflow.</p>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
