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
import { deleteThingAction, milestoneAction, requestAction, setStageAction } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project — Studio Desk | NextBiz Studio" };

const fmtDay = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const fmtWhen = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const FileA = ({ f }: { f: FileRow }) => <a className="ca-file" href={`/portal/files/${f.id}`} target="_blank" rel="noreferrer">{f.kind === "link" ? "🔗" : "📄"} {f.name}</a>;

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id, pid } = await params;
  const [c, p] = await Promise.all([getClient(id), getProject(pid)]);
  if (!c || !p || p.client_id !== c.id) notFound();
  await markMessagesRead(p.id, "studio");
  const [milestones, requests, updates, messages, files, leads, unread] = await Promise.all([
    listMilestones(p.id), listRequests(p.id), listUpdates(p.id, 20), listMessages(p.id), listFiles(p.id), countLeads(), countUnreadForStudio(),
  ]);
  const hidden = (k: string, v: string) => <input type="hidden" name={k} value={v} />;

  return (
    <AdminShell leadCount={leads} current="clients" clientUnread={unread} crumb={`Clients · ${c.name}`} title={p.title}
      acts={<><Link className="back" href={`/admin/clients/${c.id}`}>← {c.name}</Link></>}>
      <div className="content">
        <section className="ca-card">
          <div className="ca-row ca-between"><h2>Stage</h2><span className="ca-sub">Changing it emails the client.</span></div>
          <div className="ca-stages">
            {STAGES.map((s) => (
              <form key={s.id} action={setStageAction}>{hidden("project", p.id)}{hidden("stage", s.id)}
                <button type="submit" className={p.stage === s.id ? "on" : ""} aria-pressed={p.stage === s.id}>{s.label}</button>
              </form>
            ))}
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
