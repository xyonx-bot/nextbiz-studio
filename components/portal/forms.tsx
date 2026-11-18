"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessageAction, setPasswordAction, uploadFileAction, type PostState, type PwState } from "@/app/portal/actions";

export function MessageForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<PostState, FormData>(sendMessageAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state?.at, state?.ok]);
  return (
    <form ref={ref} action={act} className="pt-compose">
      <input type="hidden" name="project" value={projectId} />
      <label className="pt-attach" title="Attach a file (up to 7 MB)">📎<input type="file" name="file" hidden /></label>
      <textarea className="pt-in" name="body" placeholder="Write a message…" rows={2} maxLength={4000} aria-label="Message"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
      <button className="pt-btn ink" type="submit" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
    </form>
  );
}

export function UploadForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<PostState, FormData>(uploadFileAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state?.at, state?.ok]);
  return (
    <form ref={ref} action={act} className="pt-upload">
      <input type="hidden" name="project" value={projectId} />
      <div className="pt-upload-row">
        <label className="pt-drop"><input type="file" name="file" /><span><b>Choose a file</b> · up to 7 MB</span></label>
        <span className="pt-or-word">or</span>
        <input className="pt-in" name="url" type="url" placeholder="Paste a link (Google Drive, Dropbox…)" />
        <input className="pt-in" name="name" type="text" placeholder="Name for the link (optional)" maxLength={200} />
      </div>
      <div className="pt-upload-foot">
        <span className="pt-small">Only you and the studio can see these.</span>
        <button className="pt-btn" type="submit" disabled={busy}>{busy ? "Uploading…" : "Add"}</button>
      </div>
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
      {state?.ok && <p className="pt-ok" role="status">Added. The studio has been told.</p>}
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, act, busy] = useActionState<PwState, FormData>(setPasswordAction, null);
  return (
    <form action={act} className="pt-form pt-narrow">
      {hasPassword && (<><label className="pt-lbl" htmlFor="pw-cur">Current password</label><input className="pt-in" id="pw-cur" name="current" type="password" autoComplete="current-password" /></>)}
      <label className="pt-lbl" htmlFor="pw-new">{hasPassword ? "New password" : "Password"}</label>
      <input className="pt-in" id="pw-new" name="password" type="password" autoComplete="new-password" minLength={8} />
      <label className="pt-lbl" htmlFor="pw-again">Type it again</label>
      <input className="pt-in" id="pw-again" name="again" type="password" autoComplete="new-password" minLength={8} />
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
      {state?.ok && <p className="pt-ok" role="status">Saved.</p>}
      <div className="pt-row">
        <button className="pt-btn ink" type="submit" disabled={busy}>{busy ? "Saving…" : hasPassword ? "Change password" : "Set password"}</button>
        {hasPassword && <button className="pt-linkbtn" type="submit" name="remove" value="1">Remove password (use codes only)</button>}
      </div>
    </form>
  );
}
