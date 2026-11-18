import { notFound, redirect } from "next/navigation";
import {
  STAGES, currentClient, fmtSize, getProject, listFiles, listMessages, listMilestones, listProjects, listRequests, listUpdates,
  markMessagesRead, unreadFor, type FileRow,
} from "@/lib/portal";
import { PortalShell, type Tab } from "@/components/portal/shell";
import { MessageForm, UploadForm } from "@/components/portal/forms";

export const dynamic = "force-dynamic";

const fmtDay = (d: string | null) => (d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const fmtWhen = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const ext = (f: FileRow) => (f.kind === "link" ? "LINK" : (f.name.split(".").pop() ?? "FILE").slice(0, 4).toUpperCase());

function FileLink({ f }: { f: FileRow }) {
  return <a className="pt-file" href={`/portal/files/${f.id}`} target={f.kind === "link" ? "_blank" : undefined} rel="noreferrer"><span className="pt-ficon">{ext(f)}</span>{f.name}</a>;
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
  const [projects, milestones, requests, updates, messages, files, unread] = await Promise.all([
    listProjects(c.id), listMilestones(p.id), listRequests(p.id), listUpdates(p.id, tab === "overview" ? 3 : 50),
    tab === "messages" ? listMessages(p.id) : Promise.resolve([]), tab === "files" ? listFiles(p.id) : Promise.resolve([]),
    unreadFor(p.id, "client"),
  ]);
  const stageIdx = STAGES.findIndex((s) => s.id === p.stage);
  const next = milestones.find((m) => !m.done);
  const pct = milestones.length ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : null;
  const waiting = requests.filter((r) => !r.done);

  return (
    <PortalShell client={c} projects={projects} project={p} tab={tab} unread={tab === "messages" ? 0 : unread}>
      <div className="pt-top">
        <div><span className="pt-micro">{tab}</span><h1>{p.title}</h1></div>
        <span className="pt-pill live">{STAGES[stageIdx]?.label ?? p.stage}</span>
      </div>

      {tab === "overview" && (<>
        <ol className="pt-track" aria-label="Project stages">
          {STAGES.map((s, i) => (
            <li key={s.id} className={i < stageIdx ? "done" : i === stageIdx ? "now" : "todo"}>
              <b>{s.label}</b><small>{i < stageIdx ? "Done" : i === stageIdx ? "Now" : "Coming up"}</small>
            </li>
          ))}
        </ol>
        {p.summary && <p className="pt-summary">{p.summary}</p>}
        <div className="pt-grid2">
          <section className="pt-card">
            <h3>Latest updates</h3>
            {updates.length === 0 ? <p className="pt-small">Updates from the studio will show here.</p> : updates.map((u) => (
              <article className="pt-upd" key={u.id}><small>{fmtWhen(u.created_at)}</small><p>{u.body}</p>{u.file && <FileLink f={u.file} />}</article>
            ))}
            {updates.length > 0 && <a className="pt-more" href={`/portal/p/${p.id}?tab=updates`}>All updates →</a>}
          </section>
          <div className="pt-stack">
            <section className="pt-card">
              <h3>Next milestone</h3>
              {next ? (<><b className="pt-big">{next.title}</b>{next.due_on && <span className="pt-small">Due {fmtDay(next.due_on)}</span>}</>) : <span className="pt-small">{milestones.length ? "All milestones done." : "Milestones will appear here."}</span>}
              {pct !== null && (<><div className="pt-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div><span className="pt-small">{pct}% of milestones done</span></>)}
            </section>
            <section className="pt-card">
              <h3>Waiting on you</h3>
              {waiting.length === 0 ? <span className="pt-small">Nothing right now. 🎉</span> : (
                <ul className="pt-kv">{waiting.map((r) => <li key={r.id}><span>{r.title}</span><b>{r.due_on ? `Due ${fmtDay(r.due_on)}` : ""}</b></li>)}</ul>
              )}
              {waiting.length > 0 && <a className="pt-btn" href={`/portal/p/${p.id}?tab=files`}>Upload files</a>}
            </section>
            {milestones.length > 0 && (
              <section className="pt-card">
                <h3>Milestones</h3>
                <ul className="pt-miles">{milestones.map((m) => <li key={m.id} className={m.done ? "done" : ""}><i aria-hidden /><span>{m.title}</span><small>{fmtDay(m.due_on)}</small></li>)}</ul>
              </section>
            )}
          </div>
        </div>
      </>)}

      {tab === "updates" && (
        <section className="pt-list">
          {updates.length === 0 ? <p className="pt-empty">No updates yet. The studio posts progress here.</p> : updates.map((u) => (
            <article className="pt-upd big" key={u.id}><small>{fmtWhen(u.created_at)}</small><p>{u.body}</p>{u.file && <FileLink f={u.file} />}</article>
          ))}
        </section>
      )}

      {tab === "messages" && (
        <section className="pt-chat">
          <div className="pt-msgs">
            {messages.length === 0 && <p className="pt-empty">Say hello. The person doing the work reads every message, usually the same day.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`pt-msg ${m.sender === "client" ? "me" : ""}`}>
                <p>{m.body}</p>
                {m.file && <FileLink f={m.file} />}
                <small>{m.sender === "client" ? "You" : "Studio"} · {fmtWhen(m.created_at)}{m.sender === "client" && m.read_by_studio ? " · seen" : ""}</small>
              </div>
            ))}
          </div>
          <MessageForm projectId={p.id} />
        </section>
      )}

      {tab === "files" && (<>
        {files.length === 0 ? <p className="pt-empty">No files yet. Anything the studio shares, and anything you add, appears here.</p> : (
          <div className="pt-tablewrap"><table className="pt-table">
            <thead><tr><th>Name</th><th>From</th><th>Added</th><th>Size</th></tr></thead>
            <tbody>{files.map((f) => <tr key={f.id}><td><FileLink f={f} /></td><td>{f.uploaded_by === "client" ? "You" : "Studio"}</td><td>{new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td>{f.kind === "link" ? "Link" : fmtSize(f.size_bytes)}</td></tr>)}</tbody>
          </table></div>
        )}
        <h3 className="pt-h3">Add a file or link</h3>
        <UploadForm projectId={p.id} />
      </>)}
    </PortalShell>
  );
}
