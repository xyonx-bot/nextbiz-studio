import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import {
  STAGES, countUnreadForStudio, fmtSize, getClient, getProject, listFiles, listMessages, listMilestones, listRequests, listUpdates,
  markMessagesRead, type FileRow,
} from "@/lib/portal";
import { AdminShell } from "@/components/admin/shell";
import { FileForm, ProjectEditForm, ReplyForm, UpdateForm } from "@/components/admin/client-forms";
import { deleteThingAction, milestoneAction, paymentOpAction, requestAction } from "../../../actions";
import { StageMover } from "@/components/admin/stage-mover";
import { MarkPaidButton, ProjectValueForm, RecordPaymentForm, RequestPaymentForm } from "@/components/admin/payment-forms";
import { VIA_LABEL, isOverdue, listPayments, money, payRef, rzpOn, rzpTestMode, stageBlockedBy, totals } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project — Studio Desk | NextBiz Studio" };

const fmtDay = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const fmtWhen = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const FileA = ({ f }: { f: FileRow }) => <a className="ca-file" href={`/portal/files/${f.id}`} target="_blank" rel="noreferrer">{f.kind === "link" ? "🔗" : "📄"} {f.name}</a>;

export default async function AdminProjectPage({ params, searchParams }: { params: Promise<{ id: string; pid: string }>; searchParams: Promise<{ held?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id, pid } = await params;
  const [c, p] = await Promise.all([getClient(id), getProject(pid)]);
  if (!c || !p || p.client_id !== c.id) notFound();
  await markMessagesRead(p.id, "studio");
  const [milestones, requests, updates, messages, files, leads, unread, payments] = await Promise.all([
    listMilestones(p.id), listRequests(p.id), listUpdates(p.id, 20), listMessages(p.id), listFiles(p.id), countLeads(), countUnreadForStudio(), listPayments(p.id),
  ]);
  const held = (await searchParams).held;
  const heldBy = held ? payments.find((x) => x.id === held && x.status === "requested") : null;
  const sums = totals(payments, p);
  const cur = p.value_currency ?? "INR";
  const hidden = (k: string, v: string) => <input type="hidden" name={k} value={v} />;

  return (
    <AdminShell leadCount={leads} current="clients" clientUnread={unread} crumb={`Clients · ${c.name}`} title={p.title}
      acts={<><Link className="back" href={`/admin/clients/${c.id}`}>← {c.name}</Link></>}>
      <div className="content">
        <section className="ca-card">
          <div className="ca-row ca-between"><h2>Stage</h2><span className="ca-sub">Moves one step at a time, after you confirm.</span></div>
          {heldBy && <p className="ca-err" role="alert">Can&apos;t move yet: “{heldBy.label}” ({money(heldBy.amount, heldBy.currency)}) is unpaid and holds this stage. Mark it paid or cancel it first.</p>}
          <ol className="ca-stagebar">
            {STAGES.map((s, i) => {
              const cur = STAGES.findIndex((x) => x.id === p.stage);
              const lock = i > cur && stageBlockedBy(payments, s.id);
              const st = i < cur ? "done" : i === cur ? "now" : lock ? "held" : "todo";
              return (
                <li key={s.id} className={st}>
                  <span className="sb-dot" aria-hidden>{st === "done" ? "✓" : st === "held" ? "🔒" : i + 1}</span>
                  <span><b>{s.label}</b><small>{st === "done" ? "Done" : st === "now" ? "Current" : st === "held" ? "Held for payment" : "Next up"}</small></span>
                </li>
              );
            })}
          </ol>
          {(() => {
            const cur = STAGES.findIndex((x) => x.id === p.stage);
            const prev = cur > 0 ? STAGES[cur - 1] : null, next = cur < STAGES.length - 1 ? STAGES[cur + 1] : null;
            const hold = next ? stageBlockedBy(payments, next.id) : null;
            return <StageMover projectId={p.id} prev={prev} next={next} heldBy={hold ? { label: hold.label, amount: money(hold.amount, hold.currency) } : null} />;
          })()}
        </section>

        <section className="ca-card">
          <div className="ca-row ca-between"><h2>Payments {payments.length ? <em>{payments.length}</em> : null}</h2>
            <span className={`ca-tag ${rzpOn() ? "ok" : "off"}`}>{rzpOn() ? (rzpTestMode() ? "Razorpay · test mode" : "Razorpay · live") : "Razorpay not connected"}</span></div>
          <div className="pay-sums">
            {sums.map((t) => (
              <dl key={t.currency}>
                <div><dt>Project value</dt><dd>{t.value != null ? money(t.value, t.currency) : "—"}</dd></div>
                <div><dt>Requested</dt><dd>{money(t.requested, t.currency)}</dd></div>
                <div><dt>Received</dt><dd>{money(t.paid, t.currency)}</dd></div>
                <div className={t.due ? "due" : ""}><dt>Due now</dt><dd>{money(t.due, t.currency)}</dd></div>
                {t.value != null && <div><dt>Still to collect</dt><dd>{money(Math.max(0, t.value - t.paid), t.currency)}</dd></div>}
              </dl>
            ))}
          </div>
          {payments.length > 0 && (
            <div className="ca-tablewrap pay-wrap"><table className="ca-table pay-table">
              <thead><tr><th>For</th><th>Amount</th><th>Status</th><th>Details</th><th /></tr></thead>
              <tbody>
                {payments.map((x) => (
                  <tr key={x.id} className={x.status === "cancelled" ? "off" : ""}>
                    <td><b>{x.label}</b><small>{payRef(x)}{x.blocks_stage && x.status === "requested" ? ` · holds ${STAGES.find((s) => s.id === x.blocks_stage)?.label}` : ""}</small></td>
                    <td><b>{money(x.amount, x.currency)}</b></td>
                    <td><span className={`pay-st ${x.status === "paid" ? "paid" : x.status === "cancelled" ? "cancelled" : isOverdue(x) ? "overdue" : "due"}`}>{x.status === "paid" ? (x.kind === "record" ? "Received" : "Paid") : x.status === "cancelled" ? "Cancelled" : isOverdue(x) ? "Overdue" : "Requested"}</span></td>
                    <td><small>{x.status === "paid" ? `${fmtWhen(x.paid_at!)} · ${VIA_LABEL[x.paid_via ?? ""] ?? x.paid_via ?? ""}${x.paid_ref ? ` · ${x.paid_ref}` : ""}` : x.due_on ? `Due ${fmtDay(x.due_on)}` : `Asked ${fmtWhen(x.created_at)}`}</small></td>
                    <td className="pay-acts">
                      {x.status === "requested" && <><MarkPaidButton projectId={p.id} id={x.id} />
                        <form action={paymentOpAction}>{hidden("project", p.id)}{hidden("id", x.id)}{hidden("op", "cancel")}<button className="ca-x" type="submit">Cancel</button></form></>}
                      {x.status === "paid" && x.kind === "request" && !x.rzp_payment_id && <form action={paymentOpAction}>{hidden("project", p.id)}{hidden("id", x.id)}{hidden("op", "reopen")}<button className="ca-x" type="submit">Undo paid</button></form>}
                      {(x.status === "cancelled" || x.kind === "record") && <form action={paymentOpAction}>{hidden("project", p.id)}{hidden("id", x.id)}{hidden("op", "delete")}<button className="ca-x" type="submit">Delete</button></form>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <div className="pay-forms">
            <details className="pay-det" open={payments.length === 0}><summary>Request a payment</summary><RequestPaymentForm projectId={p.id} currency={cur} /></details>
            <details className="pay-det"><summary>Log money received outside the portal</summary><RecordPaymentForm projectId={p.id} currency={cur} /></details>
            <details className="pay-det"><summary>Project value</summary><ProjectValueForm projectId={p.id} value={p.value_amount != null ? String(Number(p.value_amount) / 100) : ""} currency={cur} /></details>
          </div>
        </section>

        <div className="ca-grid">
          <div className="ca-col">
            <section className="ca-card">
              <h2>Messages {messages.length ? <em>{messages.length}</em> : null}</h2>
              <div className="ca-thread">
                {messages.length === 0 && <p className="ca-sub">No messages yet. The client can write from their portal; you&apos;ll get an email and a Slack ping.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`ca-msg ${m.sender === "studio" ? "me" : ""}`}>
                    <p>{m.body}</p>{m.file && <FileA f={m.file} />}
                    <small>{m.sender === "studio" ? "You" : c.name} · {fmtWhen(m.created_at)}{m.sender === "studio" && m.read_by_client ? " · seen" : ""}</small>
                  </div>
                ))}
              </div>
              <ReplyForm projectId={p.id} />
            </section>

            <section className="ca-card">
              <h2>Post an update</h2>
              <UpdateForm projectId={p.id} />
              {updates.map((u) => (
                <div key={u.id} className="ca-upd">
                  <small>{fmtWhen(u.created_at)}</small><p>{u.body}</p>{u.file && <FileA f={u.file} />}
                  <form action={deleteThingAction}>{hidden("project", p.id)}{hidden("what", "update")}{hidden("id", u.id)}<button className="ca-x" type="submit" aria-label="Delete update">Delete</button></form>
                </div>
              ))}
            </section>
          </div>

          <div className="ca-col">
            <section className="ca-card">
              <h2>Milestones</h2>
              <ul className="ca-list">
                {milestones.map((m) => (
                  <li key={m.id} className={m.done ? "done" : ""}>
                    <form action={milestoneAction}>{hidden("project", p.id)}{hidden("id", m.id)}{hidden("op", m.done ? "undo" : "done")}<button className="ca-tick" type="submit" aria-label={m.done ? "Mark not done" : "Mark done"}>{m.done ? "✓" : ""}</button></form>
                    <span>{m.title}</span><small>{fmtDay(m.due_on)}</small>
                    <form action={milestoneAction}>{hidden("project", p.id)}{hidden("id", m.id)}{hidden("op", "del")}<button className="ca-x" type="submit" aria-label="Delete milestone">×</button></form>
                  </li>
                ))}
              </ul>
              <form action={milestoneAction} className="ca-row ca-addrow">{hidden("project", p.id)}{hidden("op", "add")}
                <input className="ca-in" name="title" placeholder="e.g. Store ready for review" required /><input className="ca-in ca-date" name="due" type="date" /><button className="ca-btn" type="submit">Add</button>
              </form>
            </section>

            <section className="ca-card">
              <h2>Waiting on the client</h2>
              <ul className="ca-list">
                {requests.map((r) => (
                  <li key={r.id} className={r.done ? "done" : ""}>
                    <form action={requestAction}>{hidden("project", p.id)}{hidden("id", r.id)}{hidden("op", r.done ? "undo" : "done")}<button className="ca-tick" type="submit" aria-label={r.done ? "Mark not received" : "Mark received"}>{r.done ? "✓" : ""}</button></form>
                    <span>{r.title}</span><small>{fmtDay(r.due_on)}</small>
                    <form action={requestAction}>{hidden("project", p.id)}{hidden("id", r.id)}{hidden("op", "del")}<button className="ca-x" type="submit" aria-label="Delete request">×</button></form>
                  </li>
                ))}
              </ul>
              <form action={requestAction} className="ca-form">{hidden("project", p.id)}{hidden("op", "add")}
                <div className="ca-row ca-addrow"><input className="ca-in" name="title" placeholder="e.g. Product photos (12)" required /><input className="ca-in ca-date" name="due" type="date" /><button className="ca-btn" type="submit">Ask</button></div>
                <label className="ca-check"><input type="checkbox" name="notify" defaultChecked /> Email the client</label>
              </form>
            </section>

            <section className="ca-card">
              <h2>Files {files.length ? <em>{files.length}</em> : null}</h2>
              <ul className="ca-list ca-files">
                {files.map((f) => (
                  <li key={f.id}><FileA f={f} /><small>{f.uploaded_by === "client" ? "Client" : "You"} · {f.kind === "link" ? "link" : fmtSize(f.size_bytes)}</small>
                    <form action={deleteThingAction}>{hidden("project", p.id)}{hidden("what", "file")}{hidden("id", f.id)}<button className="ca-x" type="submit" aria-label="Delete file">×</button></form>
                  </li>
                ))}
              </ul>
              <FileForm projectId={p.id} />
            </section>

            <section className="ca-card"><h2>Project details</h2><ProjectEditForm p={p} /></section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
