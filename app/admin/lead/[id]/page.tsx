import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { countLeads, getLead } from "@/lib/db";
import { fmtRel, fmtStamp } from "@/lib/format";
import { setStatusAction, addNoteAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/shell";
import { ArrowLeft, ArrowRight, Check } from "@/components/admin/icons";

/**
 * S4 (P1.7) — lead detail, ported from Mira's admin/lead/wireframe.html:
 * 2-col — left: the brief as submitted + append-only desk-notes ledger
 * (status moves render as inline chips, capture as a muted SYS entry);
 * right: pipeline stepper + "Move to" quick actions + lead meta.
 */
export const dynamic = "force-dynamic";

const ORDER = ["new", "replied", "quoted"] as const;
const DOT: Record<string, string> = {
  new: "var(--ink)",
  replied: "var(--st-blue)",
  quoted: "var(--st-amber)",
  won: "var(--st-green)",
  lost: "var(--st-red)",
};

function noteWhen(d: Date): [string, string] {
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  return [day, time];
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  const [lead, total] = await Promise.all([getLead(id), countLeads()]);
  if (!lead) notFound();

  // stage dates from status ledger entries ("old → new" @ time)
  const stageAt: Record<string, Date> = { new: lead.created_at };
  for (const n of lead.notes) {
    if (n.kind === "status") {
      const to = n.note.split("→").pop()?.trim();
      if (to) stageAt[to] = n.created_at;
    }
  }
  const lastActivity = lead.notes.length > 0 ? lead.notes[0].created_at : lead.created_at;

  // stepper states
  const isTerminal = lead.status === "won" || lead.status === "lost";
  const curIdx = ORDER.indexOf(lead.status as (typeof ORDER)[number]);

  return (
    <AdminShell
      leadCount={total}
      crumb={`Leads · ${lead.name}`}
      title={<>{lead.name} <span className={`st st-${lead.status}`}><i />{lead.status}</span></>}
      acts={<Link className="back" href="/admin">← Inbox <ArrowLeft size={13} /></Link>}
    >
      <div className="dwrap">
        {/* ══ LEFT: brief + notes ══ */}
        <div className="dcol-l">
          <div className="panel">
            <div className="phead">
              <span className="pt">The brief · As submitted</span>
              <span className="when">{fmtStamp(lead.created_at)} · via contact form</span>
            </div>
            <div className="brow"><span className="bl">Name</span><span className="bv big">{lead.name}</span></div>
            <div className="brow">
              <span className="bl">Phone</span>
              <span className="bv">
                {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}
                <span className="sub">Mon–Sat reachable, 10:00–20:00</span>
              </span>
            </div>
            <div className="brow">
              <span className="bl">Email</span>
              <span className="bv">{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "—"}</span>
            </div>
            <div className="brow"><span className="bl">Service</span><span className="bv">{lead.service || "—"}</span></div>
            <div className="brow"><span className="bl">Budget</span><span className="bv">{lead.budget || "—"}</span></div>
            <div className="brow"><span className="bl">Message</span><span className="bv">{lead.message}</span></div>
          </div>

          <div className="panel">
            <div className="phead">
              <span className="pt">Desk notes · {lead.notes.length}</span>
              <span className="when">Newest first</span>
            </div>
            {lead.notes.map((n) => {
              const [day, time] = noteWhen(n.created_at);
              const sys = n.kind === "system";
              return (
                <div className={`note${sys ? " sys" : ""}`} key={n.id}>
                  <div className="nwho">
                    <span className="av">{sys ? "SYS" : "J"}</span>
                    <time>{day}<br />{time}</time>
                  </div>
                  <div className="nbody">
                    {n.kind === "status" ? (
                      <span className="st-inline">
                        <i style={{ background: DOT[n.note.split("→").pop()?.trim() ?? "new"] }} />
                        {n.note}
                      </span>
                    ) : n.note}
                  </div>
                </div>
              );
            })}
            <form className="ncomposer" action={addNoteAction}>
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="note" rows={2} maxLength={2000} required
                placeholder="Add a desk note — what happened on this lead? (saved with your name + timestamp, persists across reload)" />
              <div className="nc-foot">
                <span className="hint">Notes are append-only — the history stays honest.</span>
                <button className="action" type="submit" data-testid="save-note">
                  Save note <ArrowRight size={12} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ══ RIGHT: pipeline rail ══ */}
        <div className="dcol-r">
          <div className="rail">
            <div className="rhead">Pipeline · {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}</div>
            <div className="steps">
              {ORDER.map((s, idx) => {
                const done = isTerminal || (curIdx >= 0 && idx < curIdx);
                const cur = !isTerminal && idx === curIdx;
                return (
                  <div className={`step${done ? " done" : ""}${cur ? " cur" : ""}`} key={s}>
                    <span className={`pip${done ? " done" : ""}${cur ? " cur" : ""}`}>
                      {done && <Check size={8} />}
                    </span>
                    <span className="sl">{s.charAt(0).toUpperCase() + s.slice(1)}
                      <small>{stageAt[s] ? fmtStamp(stageAt[s]) : cur ? "current stage" : "pending"}</small>
                    </span>
                    <span className="sd">{done && stageAt[s] ? fmtRel(stageAt[s]) : cur ? "current stage" : "—"}</span>
                  </div>
                );
              })}
              <div className={`step${isTerminal ? " done" : ""}`}>
                <span className={`pip${isTerminal ? " done" : ""}`}>{isTerminal && <Check size={8} />}</span>
                <span className="sl">{isTerminal ? (lead.status === "won" ? "Won" : "Lost") : "Won / Lost"}
                  <small>{isTerminal && stageAt[lead.status] ? fmtStamp(stageAt[lead.status]) : "terminal"}</small>
                </span>
                <span className="sd">{isTerminal ? "closed" : "—"}</span>
              </div>
            </div>
            <div className="ract">
              <span className="lbl">Move to</span>
              <div className="btnrow">
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="status" value="quoted" />
                  <button className="rbtn primary" type="submit" disabled={lead.status === "quoted"} data-testid="mark-quoted">Mark quoted</button>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="status" value="replied" />
                  <button className="rbtn" type="submit" disabled={lead.status === "replied"} data-testid="mark-replied">Mark replied</button>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="status" value="won" />
                  <button className="rbtn" type="submit" disabled={lead.status === "won"} data-testid="mark-won">Mark won</button>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="status" value="lost" />
                  <button className="rbtn danger" type="submit" disabled={lead.status === "lost"} data-testid="mark-lost">Mark lost</button>
                </form>
              </div>
            </div>
          </div>

          <div className="rail">
            <div className="rhead">Lead meta</div>
            <div className="mrow2"><span className="mk">Source</span><span className="mv">Contact form</span></div>
            <div className="mrow2"><span className="mk">Captured</span><span className="mv">{fmtStamp(lead.created_at)} IST</span></div>
            <div className="mrow2"><span className="mk">Last activity</span><span className="mv">{fmtRel(lastActivity)}</span></div>
            <div className="mrow2"><span className="mk">Slack ping</span><span className="mv">#agent-org</span></div>
            <div className="mrow2"><span className="mk">Lead ID</span><span className="mv" style={{ fontWeight: 700, letterSpacing: ".5px" }}>#{`NB-${lead.id.slice(0, 4).toUpperCase()}`}</span></div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
