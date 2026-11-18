import { notFound, redirect } from "next/navigation";
import {
  STAGES, currentClient, fmtSize, getProject, listFiles, listMessages, listMilestones, listProjects, listRequests, listUpdates,
  markMessagesRead, unreadFor, type FileRow, type MessageRow,
} from "@/lib/portal";
import { CONTACT } from "@/lib/content";
import { PortalHead, PortalShell, type Tab } from "@/components/portal/shell";
import { MessageForm, UploadForm } from "@/components/portal/forms";

export const dynamic = "force-dynamic";

const TZ = "Asia/Kolkata";
// pg hands back DATE columns as strings or Dates depending on the query; handle both
const fmtDay = (d: string | Date | null) => {
  if (!d) return "";
  const v = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00+05:30`) : new Date(d);
  return isNaN(v.getTime()) ? "" : v.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ });
};
const fmtWhen = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const dayKey = (d: string) => new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const dd = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", timeZone: TZ });
const mon = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", timeZone: TZ });
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

function FileLink({ f, plain }: { f: FileRow; plain?: boolean }) {
  return (
    <a className={`pt-file${plain ? " plain" : ""}`} href={`/portal/files/${f.id}`} target="_blank" rel="noreferrer">
      <span className={`pt-ficon${f.kind === "link" ? " link" : ""}`}>{ext(f)}</span><span className="pt-fname">{f.name}</span>
    </a>
  );
}

function Journal({ updates, limit }: { updates: { id: string; body: string; created_at: string; file: FileRow | null }[]; limit?: boolean }) {
  return (
    <ol className={`pt-journal${limit ? " short" : ""}`}>
      {updates.map((u) => (
        <li key={u.id}>
          <time dateTime={u.created_at}><b>{dd(u.created_at)}</b><span>{mon(u.created_at)}</span></time>
          <div className="pt-jbody">
            <span className="pt-jmeta">From the studio · {fmtTime(u.created_at)}</span>
            <p>{u.body}</p>
            {u.file && <FileLink f={u.file} />}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const { id } = await params;
  const p = await getProject(id);
  if (!p || p.client_id !== c.id) notFound();
  const sp = await searchParams;
  const tab: Tab = (["overview", "updates", "messages", "files"] as const).find((t) => t === sp.tab) ?? "overview";
  if (tab === "messages") await markMessagesRead(p.id, "client");
  const [projects, milestonesRaw, requests, updates, messages, files, unread] = await Promise.all([
    listProjects(c.id), listMilestones(p.id), listRequests(p.id), listUpdates(p.id, tab === "overview" ? 4 : 100),
    tab === "messages" ? listMessages(p.id) : Promise.resolve([] as MessageRow[]), tab === "files" ? listFiles(p.id) : Promise.resolve([] as FileRow[]),
    unreadFor(p.id, "client"),
  ]);
  // in date order (undated last), so the bar and the list read left to right
  const time = (d: string | null) => (d ? new Date(d).getTime() : Infinity);
  const milestones = [...milestonesRaw].sort((a, b) => time(a.due_on) - time(b.due_on));
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.id === p.stage));
  const stage = STAGES[stageIdx];
  const next = milestones.find((m) => !m.done);
  const doneCount = milestones.filter((m) => m.done).length;
  const waiting = requests.filter((r) => !r.done);
  const filesTab = `/portal/p/${p.id}?tab=files`;
  const first = c.name.split(/\s+/)[0];

  const facts = [
    { k: "Stage", v: `${String(stageIdx + 1).padStart(2, "0")} · ${stage.label}`, live: true },
    { k: "Next milestone", v: next ? `${next.title}${next.due_on ? ` · ${fmtDay(next.due_on)}` : ""}` : milestones.length ? "All done" : "To be set" },
    { k: "Waiting on you", v: waiting.length ? `${waiting.length} item${waiting.length > 1 ? "s" : ""}` : "Nothing" },
    { k: "Last update", v: ago(updates[0]?.created_at) },
  ];

  /* group messages by day for the thread */
  const days: { day: string; items: MessageRow[] }[] = [];
  for (const m of messages) {
    const k = dayKey(m.created_at);
    if (days.at(-1)?.day !== k) days.push({ day: k, items: [] });
    days.at(-1)!.items.push(m);
  }
  const mine = files.filter((f) => f.uploaded_by === "client").length;
  const totalBytes = files.reduce((n, f) => n + (f.size_bytes ?? 0), 0);

  return (
    <PortalShell client={c} projects={projects} project={p} tab={tab} unread={tab === "messages" ? 0 : unread}>
      {tab === "overview" && (<>
        <PortalHead micro={`${c.business || c.name} · started ${fmtDay(p.created_at)}`} title={p.title}
          sub={p.summary || `Hi ${first}. This page shows where your project stands. It changes as we work.`} facts={facts} />

        <section className="pt-sec" aria-labelledby="h-stage">
          <div className="pt-sechead"><span className="pt-no">01</span><h2 id="h-stage">Where it stands</h2><span className="pt-aside">Stage {stageIdx + 1} of {STAGES.length}</span></div>
          <ol className="pt-rail">
            {STAGES.map((s, i) => {
              const st = i < stageIdx ? "done" : i === stageIdx ? "now" : "todo";
              return (
                <li key={s.id} className={st} aria-current={st === "now" ? "step" : undefined}>
                  <span className="pt-railno">{String(i + 1).padStart(2, "0")}</span>
                  <b>{s.label}</b>
                  <span className="pt-railst">{st === "done" ? "Done" : st === "now" ? "In progress" : "Coming up"}</span>
                  <p>{STAGE_NOTE[s.id]}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={`pt-sec pt-ask${waiting.length ? " on" : ""}`} aria-labelledby="h-ask">
          <div className="pt-sechead"><span className="pt-no">02</span><h2 id="h-ask">Waiting on you</h2>
            <span className="pt-aside">{waiting.length ? `${waiting.length} to send` : "All clear"}</span></div>
          {waiting.length === 0 ? (
            <p className="pt-quiet">Nothing needed from you right now. When we need photos, text or a decision, it shows up here and we email you.</p>
          ) : (
            <ul className="pt-asklist">
              {waiting.map((r, i) => (
                <li key={r.id}>
                  <span className="pt-askno">{String(i + 1).padStart(2, "0")}</span>
                  <b>{r.title}</b>
                  <span className="pt-askdue">{r.due_on ? `By ${fmtDay(r.due_on)}` : "When you can"}</span>
                  <a href={filesTab}>Send it →</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pt-split">
          <section className="pt-sec" aria-labelledby="h-upd">
            <div className="pt-sechead"><span className="pt-no">03</span><h2 id="h-upd">Latest from the studio</h2>
              {updates.length > 0 && <a className="pt-aside pt-arrow" href={`/portal/p/${p.id}?tab=updates`}>All updates →</a>}</div>
            {updates.length === 0 ? <p className="pt-quiet">We post a short note here whenever something moves. The first one is on its way.</p> : <Journal updates={updates} limit />}
          </section>

          <section className="pt-sec" aria-labelledby="h-mile">
            <div className="pt-sechead"><span className="pt-no">04</span><h2 id="h-mile">Milestones</h2>
              {milestones.length > 0 && <span className="pt-aside">{doneCount} of {milestones.length} done</span>}</div>
            {milestones.length === 0 ? <p className="pt-quiet">Dates for each step appear here once the plan is set.</p> : (<>
              <div className="pt-segs" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={milestones.length} aria-label="Milestones done">
                {milestones.map((m) => <i key={m.id} className={m.done ? "done" : m.id === next?.id ? "next" : ""} />)}
              </div>
              <ul className="pt-miles">
                {milestones.map((m) => (
                  <li key={m.id} className={m.done ? "done" : m.id === next?.id ? "next" : ""}>
                    <i aria-hidden>{m.done ? "✓" : ""}</i>
                    <span>{m.title}{m.id === next?.id && <em>Next</em>}</span>
                    <small>{m.due_on ? fmtDay(m.due_on) : "—"}</small>
                  </li>
                ))}
              </ul>
            </>)}
          </section>
        </div>

        <section className="pt-ways" aria-label="Talk to the studio">
          <a className="pt-way" href={`/portal/p/${p.id}?tab=messages`}><span className="pt-micro">Fastest</span><b>Message us here{unread ? ` · ${unread} new` : ""}</b><span>Read by the person doing the work, usually the same day.</span></a>
          <a className="pt-way" href={`https://wa.me/${CONTACT.phoneTel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><span className="pt-micro">Quick question</span><b>WhatsApp {CONTACT.phoneDisplay}</b><span>For anything urgent.</span></a>
          <a className="pt-way" href={filesTab}><span className="pt-micro">Files</span><b>Send files or links</b><span>Photos, logos, documents. Up to 7 MB each, or a link.</span></a>
        </section>
      </>)}

      {tab === "updates" && (<>
        <PortalHead compact micro={`${p.title} · updates`} title="Project journal" sub="Every note the studio has posted, newest first." />
        {updates.length === 0 ? <p className="pt-quiet pt-pad">No updates yet. We post a short note here whenever something moves.</p> : <div className="pt-narrowcol"><Journal updates={updates} /></div>}
      </>)}

      {tab === "messages" && (<>
        <PortalHead compact micro={`${p.title} · messages`} title="Talk to the studio" />
        <div className="pt-msgwrap">
          <section className="pt-thread" aria-label="Messages">
            <div className="pt-msgs" id="pt-msgs">
              {messages.length === 0 && (
                <div className="pt-hello"><b>Say hello.</b><p>Ask anything, share an idea, or send a file. The person doing the work reads every message.</p></div>
              )}
              {days.map((d) => (
                <div key={d.day} className="pt-day">
                  <span className="pt-dayrule"><span>{d.day}</span></span>
                  {d.items.map((m) => (
                    <article key={m.id} className={`pt-msg ${m.sender === "client" ? "me" : "them"}`}>
                      <header><b>{m.sender === "client" ? "You" : "NextBiz Studio"}</b><span>{fmtTime(m.created_at)}{m.sender === "client" && m.read_by_studio ? " · Seen" : ""}</span></header>
                      <p>{m.body}</p>
                      {m.file && <FileLink f={m.file} />}
                    </article>
                  ))}
                </div>
              ))}
            </div>
            <MessageForm projectId={p.id} />
          </section>
          <aside className="pt-msgaside">
            <dl className="pt-facts">
              <div><dt>Who reads this</dt><dd>The team on your project</dd></div>
              <div><dt>Reply time</dt><dd>Usually the same day</dd></div>
              <div><dt>Hours</dt><dd>Mon–Sat · 10am–7pm</dd></div>
            </dl>
            <p className="pt-small">Files you attach here are also kept under <a href={filesTab}>Files</a>. For something urgent, WhatsApp <a href={`https://wa.me/${CONTACT.phoneTel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{CONTACT.phoneDisplay}</a>.</p>
          </aside>
        </div>
      </>)}

      {tab === "files" && (<>
        <PortalHead compact micro={`${p.title} · files`} title="Shared folder"
          facts={files.length ? [{ k: "Items", v: String(files.length) }, { k: "From you", v: String(mine) }, { k: "Stored", v: fmtSize(totalBytes) || "0 KB" }] : undefined} />
        {files.length === 0 ? (
          <p className="pt-quiet pt-pad">The folder is empty. Anything the studio shares, and anything you add below, is kept here.</p>
        ) : (
          <div className="pt-tablewrap">
            <table className="pt-table">
              <thead><tr><th className="n">No.</th><th>Name</th><th>From</th><th>Added</th><th className="r">Size</th><th className="r"><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{files.map((f, i) => (
                <tr key={f.id}>
                  <td className="n">{String(files.length - i).padStart(2, "0")}</td>
                  <td><FileLink f={f} plain /></td>
                  <td><span className={`pt-from ${f.uploaded_by}`}>{f.uploaded_by === "client" ? "You" : "Studio"}</span><span className="pt-mmeta">{fmtDay(f.created_at)} · {f.kind === "link" ? "Link" : fmtSize(f.size_bytes)}</span></td>
                  <td>{fmtDay(f.created_at)}</td>
                  <td className="r">{f.kind === "link" ? "Link" : fmtSize(f.size_bytes)}</td>
                  <td className="r"><a className="pt-open" href={`/portal/files/${f.id}`} target="_blank" rel="noreferrer">{f.kind === "link" ? "Open ↗" : "Download"}</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <section className="pt-sec" aria-labelledby="h-add">
          <div className="pt-sechead"><span className="pt-no">↑</span><h2 id="h-add">Add to the folder</h2><span className="pt-aside">The studio gets told</span></div>
          {waiting.length > 0 && <p className="pt-quiet">We&apos;re waiting on: <b>{waiting.map((r) => r.title).join(", ")}</b>.</p>}
          <UploadForm projectId={p.id} />
        </section>
      </>)}
    </PortalShell>
  );
}
