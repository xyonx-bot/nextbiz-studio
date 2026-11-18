"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addFileAction, copyLinkAction, createClientAction, postUpdateAction, replyAction, saveProjectAction, sendInviteAction, updateClientAction,
  type FormState,
} from "@/app/admin/clients/actions";

function useReset(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !state.link) ref.current?.reset(); }, [state?.at, state?.ok, state?.link]);
  return ref;
}
const Msg = ({ s }: { s: FormState }) => (s?.error ? <p className="ca-err" role="alert">{s.error}</p> : s?.ok ? <p className="ca-ok" role="status">{s.ok}</p> : null);

export function NewClientForm({ lead }: { lead?: { id: string; name: string; email: string; phone: string; service: string; hasPlan: boolean } }) {
  const [state, act, busy] = useActionState<FormState, FormData>(createClientAction, null);
  return (
    <form action={act} className="ca-form">
      {lead && <input type="hidden" name="lead" value={lead.id} />}
      <div className="ca-two">
        <label className="ca-f"><span>Client name</span><input name="name" required defaultValue={lead?.name} autoComplete="off" /></label>
        <label className="ca-f"><span>Business <small>optional</small></span><input name="business" autoComplete="off" /></label>
      </div>
      <div className="ca-two">
        <label className="ca-f"><span>Login email</span><input name="email" type="email" required defaultValue={lead?.email} autoComplete="off" /><small>They log in with this. Codes and invites go here.</small></label>
        <label className="ca-f"><span>WhatsApp / phone <small>optional</small></span><input name="phone" defaultValue={lead?.phone} autoComplete="off" /></label>
      </div>
      <label className="ca-f"><span>First project</span><input name="project" required defaultValue={lead?.service ? `${lead.service}` : ""} placeholder="e.g. Mellowmoon online store" /></label>
      {lead && <label className="ca-check"><input type="checkbox" name="copyPlan" defaultChecked /> Copy the enquiry{lead.hasPlan ? " and their planner plan" : ""} into the project</label>}
      <label className="ca-check"><input type="checkbox" name="invite" defaultChecked /> Email the invite now (a login link that works for 7 days)</label>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Creating…" : "Create client"}</button><a className="ca-btn" href="/admin/clients">Cancel</a></div>
      <p className="ca-sub">No email? Untick the invite. On the next page you can copy a login link to send on WhatsApp.</p>
    </form>
  );
}

export function ClientEditForm({ c }: { c: { id: string; name: string; business: string | null; email: string; phone: string | null } }) {
  const [state, act, busy] = useActionState<FormState, FormData>(updateClientAction, null);
  return (
    <form action={act} className="ca-form">
      <input type="hidden" name="id" value={c.id} />
      <div className="ca-two">
        <label className="ca-f"><span>Name</span><input name="name" defaultValue={c.name} required /></label>
        <label className="ca-f"><span>Business</span><input name="business" defaultValue={c.business ?? ""} /></label>
      </div>
      <div className="ca-two">
        <label className="ca-f"><span>Login email</span><input name="email" type="email" defaultValue={c.email} required /></label>
        <label className="ca-f"><span>WhatsApp / phone</span><input name="phone" defaultValue={c.phone ?? ""} /></label>
      </div>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</button></div>
    </form>
  );
}

/** Invite by email, or copy a one-time login link (works when email is down). */
export function AccessActions({ id, phone }: { id: string; phone: string | null }) {
  const [inv, invite, inviting] = useActionState<FormState, FormData>(sendInviteAction, null);
  const [lnk, makeLink, making] = useActionState<FormState, FormData>(copyLinkAction, null);
  const [copied, setCopied] = useState(false);
  const wa = phone ? phone.replace(/\D/g, "").replace(/^0/, "").replace(/^(\d{10})$/, "91$1") : "";
  return (
    <div className="ca-access">
      <div className="ca-row">
        <form action={invite}><input type="hidden" name="id" value={id} /><button className="ca-btn" type="submit" disabled={inviting}>{inviting ? "Sending…" : "Email the invite"}</button></form>
        <form action={makeLink}><input type="hidden" name="id" value={id} /><button className="ca-btn" type="submit" disabled={making}>{making ? "Making…" : "Get a login link"}</button></form>
      </div>
      <Msg s={inv} />
      {lnk?.error && <p className="ca-err" role="alert">{lnk.error}</p>}
      {lnk?.link && (
        <div className="ca-link">
          <input readOnly value={lnk.link} onFocus={(e) => e.currentTarget.select()} aria-label="Login link" />
          <div className="ca-row">
            <button type="button" className="ca-btn pri" onClick={async () => { try { await navigator.clipboard.writeText(lnk.link!); setCopied(true); } catch { /* select it instead */ } }}>{copied ? "Copied" : "Copy link"}</button>
            {wa && <a className="ca-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Here's your NextBiz client portal login link (works once, for 24 hours): ${lnk.link}`)}`}>Send on WhatsApp</a>}
          </div>
          <p className="ca-sub">{lnk.ok}</p>
        </div>
      )}
    </div>
  );
}

export function ProjectEditForm({ p }: { p: { id: string; title: string; summary: string | null } }) {
  const [state, act, busy] = useActionState<FormState, FormData>(saveProjectAction, null);
  return (
    <form action={act} className="ca-form">
      <input type="hidden" name="project" value={p.id} />
      <label className="ca-f"><span>Project name</span><input name="title" defaultValue={p.title} required /></label>
      <label className="ca-f"><span>Summary <small>shown on the client&apos;s overview</small></span><textarea name="summary" rows={3} defaultValue={p.summary ?? ""} /></label>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
    </form>
  );
}

export function UpdateForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<FormState, FormData>(postUpdateAction, null);
  const ref = useReset(state);
  return (
    <form ref={ref} action={act} className="ca-form">
      <input type="hidden" name="project" value={projectId} />
      <textarea name="body" rows={3} placeholder="What's new? The client sees this on their overview." className="ca-ta" />
      <div className="ca-row ca-between">
        <label className="ca-filepick">📎 <input type="file" name="file" /></label>
        <label className="ca-check"><input type="checkbox" name="notify" defaultChecked /> Email the client</label>
        <button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Posting…" : "Post update"}</button>
      </div>
      <Msg s={state} />
    </form>
  );
}

export function ReplyForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<FormState, FormData>(replyAction, null);
  const ref = useReset(state);
  return (
    <form ref={ref} action={act} className="ca-form ca-reply">
      <input type="hidden" name="project" value={projectId} />
      <textarea name="body" rows={2} placeholder="Reply to the client… (they get an email)" className="ca-ta"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
      <div className="ca-row ca-between">
        <label className="ca-filepick">📎 <input type="file" name="file" /></label>
        <button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reply"}</button>
      </div>
      <Msg s={state} />
    </form>
  );
}

export function FileForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<FormState, FormData>(addFileAction, null);
  const ref = useReset(state);
  return (
    <form ref={ref} action={act} className="ca-form">
      <input type="hidden" name="project" value={projectId} />
      <label className="ca-filepick">📎 Upload a file (up to 7 MB) <input type="file" name="file" /></label>
      <div className="ca-two">
        <label className="ca-f"><span>…or a link</span><input name="url" type="url" placeholder="https://" /></label>
        <label className="ca-f"><span>Link name</span><input name="name" placeholder="e.g. Store preview" /></label>
      </div>
      <div className="ca-row ca-between">
        <label className="ca-check"><input type="checkbox" name="notify" defaultChecked /> Email the client</label>
        <button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
      </div>
      <Msg s={state} />
    </form>
  );
}
