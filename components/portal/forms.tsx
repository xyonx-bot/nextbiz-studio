"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMessageAction, setPasswordAction, uploadFileAction, type PostState, type PwState } from "@/app/portal/actions";

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const MAX = 7 * 1024 * 1024;

/** Picked-file chip with a remove button. */
function Picked({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <span className={`pt-picked${file.size > MAX ? " bad" : ""}`}>
      <b>{file.name}</b><small>{file.size > MAX ? "Over 7 MB" : kb(file.size)}</small>
      <button type="button" onClick={onClear} aria-label="Remove file">×</button>
    </span>
  );
}

export function MessageForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<PostState, FormData>(sendMessageAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setFile(null); } }, [state?.at, state?.ok]);
  // keep the newest message in view
  useEffect(() => { const el = document.getElementById("pt-msgs"); if (el) el.scrollTop = el.scrollHeight; }, [state?.at]);
  const clear = () => { if (fileRef.current) fileRef.current.value = ""; setFile(null); };
  return (
    <form ref={ref} action={act} className="pt-compose">
      <input type="hidden" name="project" value={projectId} />
      <label className="pt-composecell">
        <span className="pt-l">Your message</span>
        <textarea name="body" placeholder="Write to the studio…" rows={3} maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
      </label>
      <div className="pt-composebar">
        <label className="pt-attach">
          <input ref={fileRef} type="file" name="file" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
          <span>＋ Attach a file</span>
        </label>
        {file && <Picked file={file} onClear={clear} />}
        <span className="pt-hint">Ctrl + Enter to send</span>
        <button className="pt-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send message"} <span aria-hidden>→</span></button>
      </div>
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
    </form>
  );
}

export function UploadForm({ projectId }: { projectId: string }) {
  const [state, act, busy] = useActionState<PostState, FormData>(uploadFileAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setFile(null); } }, [state?.at, state?.ok]);
  const clear = () => { if (fileRef.current) fileRef.current.value = ""; setFile(null); };
  return (
    <form ref={ref} action={act} className="pt-upload">
      <input type="hidden" name="project" value={projectId} />
      <div className="pt-sheet two">
        <label className={`pt-drop${drag ? " drag" : ""}${file ? " has" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && fileRef.current) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; setFile(f); }
          }}>
          <span className="pt-l">A file</span>
          <input ref={fileRef} type="file" name="file" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
          {file ? <Picked file={file} onClear={clear} /> : <span className="pt-dropcta"><b>Choose a file</b> or drop it here<small>Photos, logos, PDFs, documents · up to 7 MB</small></span>}
        </label>
        <div className="pt-linkcell">
          <label className="pt-cellf"><span className="pt-l">…or a link</span><input name="url" type="url" placeholder="https://drive.google.com/…" inputMode="url" /></label>
          <label className="pt-cellf"><span className="pt-l">Name it <em>optional</em></span><input name="name" type="text" placeholder="e.g. Product photos, June shoot" maxLength={200} /></label>
        </div>
      </div>
      <div className="pt-go">
        <span className="pt-small">Bigger than 7 MB? Share a Google Drive or Dropbox link instead.</span>
        <button className="pt-btn" type="submit" disabled={busy}>{busy ? "Adding…" : "Add to folder"} <span aria-hidden>→</span></button>
      </div>
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
      {state?.ok && <p className="pt-ok" role="status">Added. The studio has been told.</p>}
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, act, busy] = useActionState<PwState, FormData>(setPasswordAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={act} className="pt-pwform">
      <div className="pt-sheet">
        {hasPassword && <label className="pt-cellf"><span className="pt-l">Current password</span><input name="current" type="password" autoComplete="current-password" /></label>}
        <div className="pt-sheet-row">
          <label className="pt-cellf"><span className="pt-l">{hasPassword ? "New password" : "Password"}</span><input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="8 characters or more" /></label>
          <label className="pt-cellf"><span className="pt-l">Type it again</span><input name="again" type="password" autoComplete="new-password" minLength={8} /></label>
        </div>
      </div>
      {state?.error && <p className="pt-err" role="alert">{state.error}</p>}
      {state?.ok && <p className="pt-ok" role="status">Saved.</p>}
      <div className="pt-go">
        {/* the main button comes first in the DOM so Enter never removes the password */}
        <button className="pt-btn ink" type="submit" disabled={busy}>{busy ? "Saving…" : hasPassword ? "Change password" : "Set password"}</button>
        {hasPassword && <button className="pt-linkbtn pt-before" type="submit" name="remove" value="1">Remove password, use codes only</button>}
      </div>
    </form>
  );
}
