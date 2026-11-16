"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { sendEmailAction } from "@/app/admin/actions";
import { PRESETS, THEMES, renderEmail, type EmailContent, type ThemeId } from "@/lib/email-templates";

export interface SentEmail { id: string; subject: string; status: string; kind: string; error: string | null; at: string }

/** Lead detail → "Email this client": preset + theme + message, live preview, send via Resend. */
export function EmailComposer({ lead, history, enabled }: {
  lead: { id: string; name: string; email: string | null; service: string | null };
  history: SentEmail[];
  enabled: boolean;
}) {
  const first = PRESETS[0];
  const [theme, setTheme] = useState<ThemeId>(first.theme);
  const [c, setC] = useState<EmailContent>(first.content);
  const [preset, setPreset] = useState(first.id);
  const [state, action, pending] = useActionState(sendEmailAction, null);

  useEffect(() => {
    if (state?.ok) { const b = PRESETS.find((p) => p.id === "blank")!; setC(b.content); setPreset("blank"); }
  }, [state?.sentAt, state?.ok]);

  const preview = useMemo(() => renderEmail(theme, c, lead), [theme, c, lead]);
  const set = (k: keyof EmailContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setC((v) => ({ ...v, [k]: e.target.value }));
  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id); setTheme(p.theme); setC({ heading: "", ctaLabel: "", ctaUrl: "", ...p.content });
  };

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
      <form action={action} className="ecomp-grid" onSubmit={(e) => {
        if (!confirm(`Send "${preview.subject}" to ${lead.email}?`)) e.preventDefault();
      }}>
        <input type="hidden" name="id" value={lead.id} />
        <input type="hidden" name="theme" value={theme} />
        <div className="ecomp-form">
          <label className="ef"><span>Start from</span>
            <select value={preset} onChange={(e) => pick(e.target.value)}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
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
          <div className="nc-foot">
            <span className={`hint${state ? (state.ok ? " ok" : " err") : ""}`} role="status">
              {state?.message ?? (enabled ? "Sends from hello@nextbizstudio.com. Moves a New lead to Replied." : "Email isn't set up on this server yet.")}
            </span>
            <button className="action" type="submit" disabled={pending || !enabled} data-testid="send-email">
              {pending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
        <div className="ecomp-prev">
          <div className="eprev-meta"><b>{preview.subject || "(no subject)"}</b><span>NextBiz Studio · to {lead.email}</span></div>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" />
        </div>
      </form>
      {history.length > 0 && (
        <div className="ehist">
          <div className="phead"><span className="pt">Emails · {history.length}</span><span className="when">Newest first</span></div>
          {history.map((h) => (
            <div className="erow" key={h.id}>
              <span className={`est est-${h.status}`}>{h.status}</span>
              <span className="esub">{h.subject}<small>{h.kind === "lead_ack" ? "Automatic thank-you" : h.kind === "lead_alert" ? "Alert to you" : "Sent from admin"}{h.error ? ` · ${h.error}` : ""}</small></span>
              <time>{h.at}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
