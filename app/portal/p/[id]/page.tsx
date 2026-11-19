import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  STAGES, currentClient, fmtSize, getProject, listFiles, listMessages, listMilestones, listProjects, listRequests, listUpdates,
  markMessagesRead, unreadFor, type FileRow, type MessageRow,
} from "@/lib/portal";
import {
  blockingPayment, getPaymentSettings, isOverdue, listPayments, money, payRef, rzpOn, rzpUpiOn, totals, VIA_LABEL, type Payment,
} from "@/lib/payments";
import { PortalShell, type Tab } from "@/components/portal/shell";
import { MessageForm, UploadForm } from "@/components/portal/forms";
import { PayBox } from "@/components/portal/pay";

export const dynamic = "force-dynamic";

const TZ = "Asia/Kolkata";
// pg hands back DATE columns as strings or Dates depending on the query; handle both
const fmtDay = (d: string | Date | null) => {
  if (!d) return "";
  const v = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00+05:30`) : new Date(d);
  return isNaN(v.getTime()) ? "" : v.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ });
};
const fmtWhen = (d: string | Date) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
const dayKey = (d: string) => new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
function ago(d: string | null | undefined) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : fmtDay(d);
}
const ext = (f: FileRow) => (f.kind === "link" ? "LINK" : (f.name.includes(".") ? f.name.split(".").pop()! : "FILE").slice(0, 4).toUpperCase());

const STAGE_NOTE: Record<string, string> = {
  plan: "We agree what we're making, the pages and the price.",
  design: "The look and the key screens, for you to approve.",
  build: "We make it, connect everything and test it.",
  launch: "It goes live, and we check it with you.",
  care: "Fixes, small changes and support after launch.",
};
const stLabel = (p: Payment) => (p.status === "paid" ? (p.kind === "record" ? "Received" : "Paid") : p.status === "cancelled" ? "Cancelled" : isOverdue(p) ? "Overdue" : "To pay");
const stClass = (p: Payment) => (p.status === "paid" ? "paid" : p.status === "cancelled" ? "cancelled" : isOverdue(p) ? "overdue" : "due");

function FileA({ f }: { f: FileRow }) {
  return <a className="pui-file" href={`/portal/files/${f.id}`} target="_blank" rel="noreferrer"><span className={`pui-ext${f.kind === "link" ? " link" : ""}`}>{ext(f)}</span><span>{f.name}</span></a>;
}
function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="pui-empty"><b>{title}</b><p>{children}</p></div>;
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const { id } = await params;
  const p = await getProject(id);
  if (!p || p.client_id !== c.id) notFound();
  const sp = await searchParams;
  const tab: Tab = (["overview", "messages", "payments", "files", "updates"] as const).find((t) => t === sp.tab) ?? "overview";
  if (tab === "messages") await markMessagesRead(p.id, "client");
  const [projects, milestonesRaw, requests, updates, messages, files, unread, payments, paySettings] = await Promise.all([
    listProjects(c.id), listMilestones(p.id), listRequests(p.id), listUpdates(p.id, tab === "updates" ? 100 : 3),
    tab === "messages" || tab === "overview" ? listMessages(p.id) : Promise.resolve([] as MessageRow[]),
    tab === "files" ? listFiles(p.id) : Promise.resolve([] as FileRow[]),
    unreadFor(p.id, "client"), listPayments(p.id), tab === "payments" ? getPaymentSettings() : Promise.resolve(null),
  ]);
  const upi = tab === "payments" ? await rzpUpiOn() : false;
  const time = (d: string | null) => (d ? new Date(d).getTime() : Infinity);
  const milestones = [...milestonesRaw].sort((a, b) => time(a.due_on) - time(b.due_on));
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.id === p.stage));
  const stage = STAGES[stageIdx];
  const next = milestones.find((m) => !m.done);
  const waiting = requests.filter((r) => !r.done);
  const due = payments.filter((x) => x.status === "requested");
  const hold = blockingPayment(payments);
  // the stage an unpaid request is holding: its own stage, or the next one if the project is already there
  const holdIdx = hold ? Math.max(STAGES.findIndex((s) => s.id === hold.blocks_stage), stageIdx + 1) : -1;
  const sums = totals(payments, p);
  const href = (t: Tab) => `/portal/p/${p.id}${t === "overview" ? "" : `?tab=${t}`}`;
  const first = c.name.split(/\s+/)[0];
  const TITLES: Record<Tab, string> = { overview: p.title, messages: "Messages", payments: "Payments", files: "Files", updates: "Updates" };

  const dueBanner = due.length > 0 && tab !== "payments" && (
    <Link className={`pui-duebar${due.some(isOverdue) ? " late" : ""}`} href={href("payments")}>
      <span className="pui-duedot" aria-hidden />
      <span><b>{due.length === 1 ? `Payment due: ${due[0].label} · ${money(due[0].amount, due[0].currency)}` : `${due.length} payments due`}</b>
        {hold && STAGES[holdIdx] ? <small>Your project moves to {STAGES[holdIdx].label} once “{hold.label}” is paid.</small> : <small>Pay by UPI, card or netbanking in a minute.</small>}</span>
      <span className="ca-btn pri">Pay now →</span>
    </Link>
  );

  /* group messages by day for the thread */
  const days: { day: string; items: MessageRow[] }[] = [];
  for (const m of messages) {
    const k = dayKey(m.created_at);
    if (days.at(-1)?.day !== k) days.push({ day: k, items: [] });
    days.at(-1)!.items.push(m);
  }

  return (
    <PortalShell client={c} projects={projects} project={p} current={tab} counts={{ unread: tab === "messages" ? 0 : unread, due: due.length }}
      crumb={tab === "overview" ? `Portal / ${c.business || c.name}` : `Portal / ${p.title}`} title={TITLES[tab]}
      acts={tab !== "messages" ? <Link className="ca-btn" href={href("messages")}>Message the studio</Link> : undefined}>
      <div className="content pui-content">
        {dueBanner}

        {tab === "overview" && (<>
          <section className="ca-card">
            <div className="ca-row ca-between"><h2>Where we are</h2><span className="ca-sub">Started {fmtDay(p.created_at)}</span></div>
            <ol className="pui-stages">
              {STAGES.map((s, i) => {
                const st = i < stageIdx ? "done" : i === stageIdx ? "now" : hold && i === holdIdx ? "held" : "todo";
                return (
                  <li key={s.id} className={st} aria-current={st === "now" ? "step" : undefined}>
                    <span className="pui-dot" aria-hidden>{st === "done" ? "✓" : st === "held" ? "🔒" : i + 1}</span>
                    <span><b>{s.label}</b><small>{st === "done" ? "Done" : st === "now" ? "In progress" : st === "held" ? "Payment pending" : "Coming up"}</small></span>
                  </li>
                );
              })}
            </ol>
            <p className="pui-note"><b>Now · {stage.label}.</b> {p.summary || STAGE_NOTE[stage.id]}</p>
          </section>

          <div className="ca-grid">
            <div className="ca-col">
              <section className="ca-card">
                <div className="ca-row ca-between"><h2>Latest from the studio</h2>{updates.length > 0 && <Link className="pui-more" href={href("updates")}>All updates →</Link>}</div>
                {updates.length === 0 ? <Empty title="No updates yet">We post a short note here whenever something moves. The first one is on its way.</Empty> : (
                  <ul className="pui-feed">
                    {updates.map((u) => <li key={u.id}><small>{fmtWhen(u.created_at)}</small><p>{u.body}</p>{u.file && <FileA f={u.file} />}</li>)}
                  </ul>
                )}
              </section>
              <section className="ca-card">
                <div className="ca-row ca-between"><h2>Messages {unread ? <span className="ca-tag new">{unread} new</span> : null}</h2><Link className="pui-more" href={href("messages")}>Open messages →</Link></div>
                {messages.length === 0 ? <Empty title="No messages yet">Ask anything, any time. The person doing the work replies, usually the same day.</Empty> : (
                  <div className="ca-thread pui-mini">
                    {messages.slice(-3).map((m) => (
                      <div key={m.id} className={`ca-msg ${m.sender === "client" ? "me" : ""}`}><p>{m.body}</p><small>{m.sender === "client" ? "You" : "NextBiz Studio"} · {fmtWhen(m.created_at)}</small></div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="ca-col">
              <section className="ca-card">
                <h2>At a glance</h2>
                <ul className="ca-kv">
                  <li><span>Stage</span><b>{String(stageIdx + 1).padStart(2, "0")} · {stage.label}</b></li>
                  <li><span>Next milestone</span><b>{next ? `${next.title}${next.due_on ? ` · ${fmtDay(next.due_on)}` : ""}` : milestones.length ? "All done" : "To be set"}</b></li>
                  <li><span>Waiting on you</span><b>{waiting.length ? `${waiting.length} item${waiting.length > 1 ? "s" : ""}` : "Nothing"}</b></li>
                  <li><span>Payments</span><b>{due.length ? <Link href={href("payments")}>{sums.filter((t) => t.due).map((t) => money(t.due, t.currency)).join(" + ")} due</Link> : payments.some((x) => x.status === "paid") ? "All paid up" : "Nothing due"}</b></li>
                  <li><span>Last update</span><b>{ago(updates[0]?.created_at)}</b></li>
                </ul>
              </section>
              <section className={`ca-card${waiting.length ? " pui-hot" : ""}`}>
                <div className="ca-row ca-between"><h2>Waiting on you</h2><span className={`ca-tag ${waiting.length ? "new" : "ok"}`}>{waiting.length ? `${waiting.length} to send` : "✓ All clear"}</span></div>
                {waiting.length === 0 ? <p className="ca-sub">Nothing needed right now. We&apos;ll email you when we need photos, text or a decision.</p> : (<>
                  <ul className="ca-list pui-list">{waiting.map((r) => <li key={r.id}><i aria-hidden /><span>{r.title}</span><small>{r.due_on ? `by ${fmtDay(r.due_on)}` : ""}</small></li>)}</ul>
                  <Link className="ca-btn" href={href("files")}>Send files</Link>
                </>)}
              </section>
              <section className="ca-card">
                <div className="ca-row ca-between"><h2>Milestones</h2>{milestones.length > 0 && <span className="ca-sub">{milestones.filter((m) => m.done).length} of {milestones.length} done</span>}</div>
                {milestones.length === 0 ? <p className="ca-sub">Each step gets a date once the plan is set.</p> : (
                  <ul className="ca-list pui-list">
                    {milestones.map((m) => <li key={m.id} className={m.done ? "done" : ""}><i aria-hidden>{m.done ? "✓" : ""}</i><span>{m.title}</span><small>{fmtDay(m.due_on)}</small></li>)}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>)}

        {tab === "messages" && (
          <div className="ca-grid">
            <section className="ca-card">
              <h2>Conversation {messages.length ? <em>{messages.length}</em> : null}</h2>
              <div className="ca-thread pui-thread" id="pui-thread">
                {messages.length === 0 && <Empty title="Start the conversation">Questions, ideas, changes, anything. Write below and the person doing the work replies.</Empty>}
                {days.map((d) => (
                  <div key={d.day} className="pui-day">
                    <span className="pui-dayrule">{d.day}</span>
                    {d.items.map((m) => (
                      <div key={m.id} className={`ca-msg ${m.sender === "client" ? "me" : ""}`}>
                        <p>{m.body}</p>{m.file && <FileA f={m.file} />}
                        <small>{m.sender === "client" ? "You" : "NextBiz Studio"} · {fmtWhen(m.created_at)}{m.sender === "client" && m.read_by_studio ? " · seen" : ""}</small>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <MessageForm projectId={p.id} />
            </section>
            <section className="ca-card">
              <h2>How this works</h2>
              <ul className="ca-kv">
                <li><span>Who reads it</span><b>The person doing your project</b></li>
                <li><span>Replies</span><b>Usually the same working day</b></li>
                <li><span>Studio hours</span><b>Mon–Sat · 10am–7pm IST</b></li>
                <li><span>Files</span><b>Attach up to 7 MB, or share a link</b></li>
              </ul>
              <p className="ca-sub">Prefer not to talk on the phone? You don&apos;t have to. Everything can happen right here.</p>
            </section>
          </div>
        )}

        {tab === "payments" && paySettings && (<>
          <div className="pay-sums">
            {sums.map((t) => (
              <dl key={t.currency}>
                {t.value != null && <div><dt>Project total</dt><dd>{money(t.value, t.currency)}</dd></div>}
                <div><dt>Paid so far</dt><dd>{money(t.paid, t.currency)}</dd></div>
                <div className={t.due ? "due" : ""}><dt>Due now</dt><dd>{money(t.due, t.currency)}</dd></div>
                {t.value != null && <div><dt>Balance after that</dt><dd>{money(Math.max(0, t.value - t.paid - t.due), t.currency)}</dd></div>}
              </dl>
            ))}
          </div>

          {due.length === 0 ? (
            <section className="ca-card"><Empty title={payments.length ? "You're all paid up" : "Nothing to pay right now"}>
              {payments.length ? "Thank you. When the next payment is due, it shows up here and we'll email you." : "When a payment is due, we'll request it here and email you. You can pay by UPI, card or netbanking in a minute."}
            </Empty></section>
          ) : due.map((x) => (
            <section key={x.id} className={`ca-card pui-paycard${isOverdue(x) ? " late" : ""}`}>
              <div className="pui-payhead">
                <div><span className="pui-micro">{payRef(x)}{x.due_on ? ` · due ${fmtDay(x.due_on)}` : ""}</span><h2>{x.label}</h2>
                  {x.note && <p className="ca-sub">{x.note}</p>}
                  {x.blocks_stage && <p className="pui-holdnote">🔒 {STAGES.find((s) => s.id === x.blocks_stage)?.label} starts once this is paid.</p>}</div>
                <div className="pui-payamt"><b>{money(x.amount, x.currency)}</b><span className={`pay-st ${stClass(x)}`}>{stLabel(x)}</span></div>
              </div>
              <PayBox id={x.id} currency={x.currency} amountLabel={money(x.amount, x.currency)} reference={payRef(x)} online={rzpOn()} upi={upi} bank={paySettings.usdBank} inrNote={paySettings.inrNote} />
            </section>
          ))}

          {payments.some((x) => x.status !== "requested") && (
            <section className="ca-card">
              <h2>History</h2>
              <div className="ca-tablewrap pay-wrap"><table className="ca-table pay-table">
                <thead><tr><th>For</th><th>Amount</th><th>Status</th><th>Date</th><th>Reference</th></tr></thead>
                <tbody>
                  {payments.filter((x) => x.status !== "requested").reverse().map((x) => (
                    <tr key={x.id} className={x.status === "cancelled" ? "off" : ""}>
                      <td><b>{x.label}</b></td><td><b>{money(x.amount, x.currency)}</b></td>
                      <td><span className={`pay-st ${stClass(x)}`}>{stLabel(x)}</span></td>
                      <td><small>{x.paid_at ? `${fmtWhen(x.paid_at)}${x.paid_via ? ` · ${VIA_LABEL[x.paid_via] ?? x.paid_via}` : ""}` : fmtWhen(x.created_at)}</small></td>
                      <td><small className="pay-mono">{x.paid_ref ?? payRef(x)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </section>
          )}
        </>)}

        {tab === "files" && (
          <div className="ca-grid">
            <section className="ca-card">
              <h2>Shared files {files.length ? <em>{files.length}</em> : null}</h2>
              {files.length === 0 ? <Empty title="Nothing here yet">Files and links you or the studio share appear here, newest first.</Empty> : (
                <div className="ca-tablewrap pay-wrap"><table className="ca-table pui-ftable">
                  <thead><tr><th>Name</th><th>From</th><th>Added</th><th>Size</th></tr></thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}><td><FileA f={f} /></td><td><span className={`ca-tag${f.uploaded_by === "client" ? "" : " ok"}`}>{f.uploaded_by === "client" ? "You" : "Studio"}</span></td>
                        <td><small>{fmtWhen(f.created_at)}</small></td><td><small>{f.kind === "link" ? "Link" : fmtSize(f.size_bytes)}</small></td></tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </section>
            <section className="ca-card">
              <h2>Send us files</h2>
              {waiting.length > 0 && <p className="ca-sub">We&apos;re waiting on: <b>{waiting.map((r) => r.title).join(", ")}</b></p>}
              <UploadForm projectId={p.id} />
            </section>
          </div>
        )}

        {tab === "updates" && (
          <section className="ca-card">
            <h2>Project updates {updates.length ? <em>{updates.length}</em> : null}</h2>
            {updates.length === 0 ? <Empty title="No updates yet">Hi {first}. We post a short note here whenever something moves.</Empty> : (
              <ul className="pui-feed">
                {updates.map((u) => <li key={u.id}><small>{fmtWhen(u.created_at)} · From the studio</small><p>{u.body}</p>{u.file && <FileA f={u.file} />}</li>)}
              </ul>
            )}
          </section>
        )}
      </div>
    </PortalShell>
  );
}
