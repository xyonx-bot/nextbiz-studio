"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveEmailSettingsAction, sendEmailAction } from "@/app/admin/actions";
import {
  ATTACH, PRESETS, THEMES, checkAttachments, renderEmail, spamHints,
  type EmailContent, type LeadVars, type ThemeId,
} from "@/lib/email-templates";

export interface SentEmail { id: string; subject: string; status: string; kind: string; error: string | null; at: string }

/* ── shared: fields + live preview ──────────────────────── */

function EmailEditor({ theme, setTheme, c, setC, vars, to, presets, onPreset, extra, warnings }: {
  theme: ThemeId; setTheme: (t: ThemeId) => void;
  c: EmailContent; setC: React.Dispatch<React.SetStateAction<EmailContent>>;
  vars: LeadVars; to: string;
  presets?: boolean; onPreset?: (id: string) => void;
  extra?: React.ReactNode; warnings: string[];
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [upl, setUpl] = useState<string>("");
  const preview = useMemo(() => renderEmail(theme, c, vars), [theme, c, vars]);
  const set = (k: keyof EmailContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setC((v) => ({ ...v, [k]: e.target.value }));

  async function upload(f: File | undefined) {
    if (!f) return;
    setUpl("Uploading…");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/config/upload", { method: "POST", body: fd }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (d?.url) { setC((v) => ({ ...v, image: d.url })); setUpl(""); } else setUpl(d?.error ?? "Upload failed");
  }
  function openFull() {
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(preview.html); w.document.close(); }
  }

  return (
    <div className="ecomp-grid">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="image" value={c.image ?? ""} />
      <div className="ecomp-form">
        {presets && (
          <label className="ef"><span>Start from</span>
            <select value={preset} onChange={(e) => { setPreset(e.target.value); onPreset?.(e.target.value); }}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        )}
        <div className="ef"><span>Theme</span>
          <div className="etheme" role="radiogroup">
            {THEMES.map((t) => (
              <button type="button" key={t.id} role="radio" aria-checked={theme === t.id}
                className={theme === t.id ? "on" : ""} title={t.hint} onClick={() => setTheme(t.id)}>
                <i className={`sw sw-${t.id}`} />{t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="ef"><span>Subject</span>
          <input name="subject" value={c.subject} onChange={set("subject")} maxLength={160} required />
        </label>
        {theme !== "plain" && (
          <label className="ef"><span>Heading <em>optional</em></span>
            <input name="heading" value={c.heading ?? ""} onChange={set("heading")} maxLength={120} />
          </label>
        )}
        <label className="ef"><span>Message</span>
          <textarea name="body" value={c.body} onChange={set("body")} rows={9} maxLength={8000} required />
          <small>{"{first_name}"}, {"{name}"} and {"{service}"} fill in automatically. Blank line = new paragraph.</small>
        </label>
        <div className="ef2">
          <label className="ef"><span>Button text <em>optional</em></span>
            <input name="ctaLabel" value={c.ctaLabel ?? ""} onChange={set("ctaLabel")} maxLength={40} placeholder="Chat on WhatsApp" />
          </label>
          <label className="ef"><span>Button link</span>
            <input name="ctaUrl" value={c.ctaUrl ?? ""} onChange={set("ctaUrl")} maxLength={500} placeholder="https://" />
          </label>
        </div>
        <div className="ef"><span>Picture <em>optional · hosted on our CDN, not embedded</em></span>
          <div className="eimg">
            {c.image
              ? <><img src={c.image} alt="" /><button type="button" className="rbtn" onClick={() => setC((v) => ({ ...v, image: "" }))}>Remove</button></>
              : <label className="rbtn efile">Add picture<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} hidden /></label>}
            {upl && <small>{upl}</small>}
          </div>
        </div>
        {extra}
        {warnings.length > 0 && (
          <ul className="espam" aria-label="Inbox tips">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        )}
      </div>
      <div className="ecomp-prev">
        <div className="eprev-bar">
          <div className="eprev-meta"><b>{preview.subject || "(no subject)"}</b><span>NextBiz Studio &lt;hello@nextbizstudio.com&gt; · to {to}</span></div>
          <div className="eprev-tools">
            <button type="button" className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>Desktop</button>
            <button type="button" className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")}>Phone</button>
            <button type="button" onClick={openFull}>Full size ↗</button>
          </div>
        </div>
        <div className={`eprev-stage ${device}`}><iframe title="Email preview" srcDoc={preview.html} sandbox="allow-popups" /></div>
      </div>
    </div>
  );
}

function Status({ state, idle }: { state: { ok?: boolean; message?: string } | null; idle: string }) {
  return <span className={`hint${state?.message ? (state.ok ? " ok" : " err") : ""}`} role="status">{state?.message ?? idle}</span>;
}

/* ── lead page: email this client ────────────────────────── */

export function EmailComposer({ lead, history, enabled, testTo }: {
  lead: { id: string; name: string; email: string | null; service: string | null };
  history: SentEmail[]; enabled: boolean; testTo: string;
}) {
  const first = PRESETS[0];
  const [theme, setTheme] = useState<ThemeId>(first.theme);
  const [c, setC] = useState<EmailContent>(first.content);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(sendEmailAction, null);
  const vars = useMemo(() => ({ name: lead.name, service: lead.service }), [lead.name, lead.service]);

  useEffect(() => {
    if (state?.ok && state.message?.startsWith("Sent")) {
      setC(PRESETS.find((p) => p.id === "blank")!.content); setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state?.sentAt, state?.ok, state?.message]);

  const attachErr = checkAttachments(files);
  const warnings = [...spamHints(c, files.length), ...(attachErr ? [attachErr] : [])];

  if (!lead.email) {
    return (
      <div className="panel">
        <div className="phead"><span className="pt">Email this client</span></div>
        <p className="ecomp-empty">No email on this lead — reply by phone or WhatsApp instead.</p>
      </div>
    );
  }

  return (
    <div className="panel ecomp" id="email">
      <div className="phead">
        <span className="pt">Email this client</span>
        <span className="when">To {lead.email}</span>
      </div>
      <form action={action} onSubmit={(e) => {
        if (modeRef.current?.value !== "test" && !confirm(`Send "${renderEmail(theme, c, vars).subject}" to ${lead.email}?`)) e.preventDefault();
      }}>
        <input type="hidden" name="id" value={lead.id} />
        {/* explicit mode field — never rely on the submit button's name/value reaching the action */}
        <input type="hidden" name="mode" ref={modeRef} defaultValue="send" />
        <EmailEditor theme={theme} setTheme={setTheme} c={c} setC={setC} vars={vars} to={lead.email}
          presets onPreset={(id) => { const p = PRESETS.find((x) => x.id === id)!; setTheme(p.theme); setC({ heading: "", ctaLabel: "", ctaUrl: "", image: "", ...p.content }); }}
          warnings={warnings}
          extra={
            <div className="ef"><span>Attachments <em>optional · PDF, images, Office · max {ATTACH.maxFiles} files, 5 MB</em></span>
              <div className="eatt">
                <label className="rbtn efile">Attach files
                  <input ref={fileRef} type="file" name="files" multiple accept={ATTACH.accept} hidden
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                </label>
                {files.map((f) => <span key={f.name} className="echip">{f.name} · {Math.max(1, Math.round(f.size / 1024))} KB</span>)}
                {files.length > 0 && <button type="button" className="elink" onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = ""; }}>Clear</button>}
              </div>
            </div>
          }
        />
        <div className="nc-foot efoot">
          <Status state={state} idle={enabled ? "Sending moves a New lead to Replied and logs it below." : "Email isn't set up on this server yet."} />
          <div className="ebtns">
            <button className="rbtn" type="submit" data-mode="test" onClick={() => { if (modeRef.current) modeRef.current.value = "test"; }} disabled={pending || !enabled || !!attachErr}
              title={testTo ? `Sends a [Test] copy to ${testTo}` : "Set your test email in Email settings"}>
              {testTo ? "Send test to me" : "Send test…"}
            </button>
            <button className="action" type="submit" data-mode="send" onClick={() => { if (modeRef.current) modeRef.current.value = "send"; }} disabled={pending || !enabled || !!attachErr} data-testid="send-email">
              {pending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      </form>
      {history.length > 0 && (
        <div className="ehist">
          <div className="phead"><span className="pt">Emails · {history.length}</span><span className="when">Newest first</span></div>
          {history.map((h) => (
            <div className="erow" key={h.id}>
              <span className={`est est-${h.status}`}>{h.status}</span>
              <span className="esub">{h.subject}<small>{KIND[h.kind] ?? h.kind}{h.error ? ` · ${h.error}` : ""}</small></span>
              <time>{h.at}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const KIND: Record<string, string> = {
  lead_ack: "Automatic thank-you", lead_alert: "Alert to you", compose: "Sent from admin", test: "Test copy",
};

/* ── /admin/email: auto-reply switch + editor ────────────── */

export function AutoReplySettings({ initial, enabled }: {
  initial: { autoReply: boolean; ackTheme: ThemeId; ack: EmailContent; testTo: string };
  enabled: boolean;
}) {
  const [on, setOn] = useState(initial.autoReply);
  const [theme, setTheme] = useState<ThemeId>(initial.ackTheme);
  const [c, setC] = useState<EmailContent>({ heading: "", ctaLabel: "", ctaUrl: "", image: "", ...initial.ack });
  const [testTo, setTestTo] = useState(initial.testTo);
  const [saveState, save, saving] = useActionState(saveEmailSettingsAction, null);
  const [testState, test, testing] = useActionState(sendEmailAction, null);
  const vars = useMemo(() => ({ name: "Asha Rao", service: "A new website" }), []);

  return (
    <>
      <form action={save} className="panel esettings">
        <div className="phead"><span className="pt">Auto thank-you · new leads</span><span className="when">{enabled ? "Resend connected" : "RESEND_API_KEY missing"}</span></div>
        <div className="eswitch">
          <label className={`tog${on ? " on" : ""}`}>
            <input type="checkbox" name="autoReply" checked={on} onChange={(e) => setOn(e.target.checked)} />
            <i aria-hidden />
            <span><b>{on ? "On — every new lead with an email gets this" : "Paused — new leads get nothing automatic"}</b>
              <small>Contact form and Instagram DM leads both count. Slack still pings you either way.</small></span>
          </label>
          <label className="ef etest"><span>Your test inbox</span>
            <input name="testTo" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@gmail.com" />
          </label>
        </div>
        <EmailEditor theme={theme} setTheme={setTheme} c={c} setC={setC} vars={vars} to="the new lead"
          warnings={spamHints(c)} />
        <div className="nc-foot efoot">
          <Status state={saveState} idle="Preview shows a sample lead (Asha Rao). Save, then send yourself a test." />
          <div className="ebtns">
            <button className="action" type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          </div>
        </div>
      </form>
      <form action={test} className="etestbar">
        {(["theme", "subject", "heading", "body", "ctaLabel", "ctaUrl", "image"] as const).map((k) => (
          <input key={k} type="hidden" name={k} value={k === "theme" ? theme : (c[k as keyof EmailContent] ?? "")} />
        ))}
        <input type="hidden" name="mode" value="test" />
        <Status state={testState} idle={initial.testTo ? `Test goes to ${initial.testTo} (saved).` : "Save a test inbox above to send yourself a copy."} />
        <button className="rbtn" type="submit" disabled={testing || !enabled}>{testing ? "Sending…" : "Send test to me"}</button>
        <Link className="elink" href="/admin">Back to leads</Link>
      </form>
    </>
  );
}
