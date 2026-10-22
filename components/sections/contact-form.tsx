"use client";

import { useState } from "react";
import contact from "@/lib/seed/contact.json";

/**
 * The brief sheet (wireframe v5 §form) — client-wired since S3.
 * Embedded in Section A of the Desk opener (right column) since the
 * Oct 20 design-fix bundle; renders ONLY the form itself.
 * Visible inline validation, success panel, friendly error; honeypot field
 * hidden via CSS. Never renders a raw error page.
 */
export function DeskForm({ content }: { content?: typeof contact.deskForm }) {
  const c = content ?? contact.deskForm;
  const f = c.fields;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setSending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      service: String(fd.get("service") ?? ""),
      budget: String(fd.get("budget") ?? ""),
      message: String(fd.get("brief") ?? ""),
      website: String(fd.get("website") ?? ""), // honeypot
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSent(true);
        return;
      }
      if (data?.errors) setErrors(data.errors);
      setFormError(data?.error ?? "Something went wrong — please try again, or just call us.");
    } catch {
      setFormError("Network hiccup — please try again, or just call us.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="form-sheet" id="brief-sheet">
        <span className="micro">{c.micro}</span>
        <div className="sheet-rows">
          <div className="callout sent-callout">
            <b>Sent — a real reply is next</b>
            Brief received. Thank you. Expect a reply from the person who'd actually do the work — usually under one business day.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="form-sheet" onSubmit={onSubmit} noValidate>
      {/* honeypot — hidden from humans, tempting for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
             aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

      <div className="sheet-rows">
        <div className={`f-row${errors.name ? " err" : ""}`}>
          <div className="lab">{f.name.label}<small>{f.name.hint}</small></div>
          <div className="field">
            <input type="text" name="name" placeholder={f.name.placeholder} required />
            {errors.name && <p className="f-error">{errors.name}</p>}
          </div>
        </div>
        <div className={`f-row${errors.phone ? " err" : ""}`}>
          <div className="lab">{f.phone.label}<small>{f.phone.hint}</small></div>
          <div className="field">
            <input type="tel" name="phone" placeholder={f.phone.placeholder} />
            {errors.phone && <p className="f-error">{errors.phone}</p>}
          </div>
        </div>
        <div className={`f-row${errors.email ? " err" : ""}`}>
          <div className="lab">{f.email.label}<small>{f.email.hint}</small></div>
          <div className="field">
            <input type="email" name="email" placeholder={f.email.placeholder} />
            {errors.email && <p className="f-error">{errors.email}</p>}
          </div>
        </div>
        <div className={`f-row${errors.service ? " err" : ""}`}>
          <div className="lab">{f.service.label}<small>{f.service.hint}</small></div>
          <div className="field">
            <select name="service" defaultValue="">
              <option value="">{f.service.placeholder}</option>
              {f.service.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className={`f-row${errors.budget ? " err" : ""}`}>
          <div className="lab">{f.budget.label}<small>{f.budget.hint}</small></div>
          <div className="field">
            <select name="budget" defaultValue="">
              <option value="">{f.budget.placeholder}</option>
              {f.budget.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className={`f-row${errors.message ? " err" : ""}`}>
          <div className="lab">{f.brief.label}<small>{f.brief.hint}</small></div>
          <div className="field">
            <textarea name="brief" placeholder={f.brief.placeholder} required />
            {errors.message && <p className="f-error">{errors.message}</p>}
          </div>
        </div>

        {formError && <div className="callout f-form-error"><b>Couldn't send</b>{formError}</div>}

        <label className="f-check"><span className="box" /><span>{c.checkText}</span></label>
        <div className="f-foot">
          <p className="hint">Typical reply: <b>under one business day</b> — from the person who'd actually do the work.</p>
          <button className="action dark f-submit" type="submit" disabled={sending}>
            {sending ? "Sending…" : c.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
