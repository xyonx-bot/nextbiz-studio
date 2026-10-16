"use client";

import { useState } from "react";
import contact from "@/lib/seed/contact.json";

/**
 * Paper form (Mira's wireframe §2) — client-wired in S3.
 * Visible inline validation, success panel, friendly error; honeypot field
 * hidden via CSS. Never renders a raw error page.
 */
export function DeskForm() {
  const c = contact.deskForm;
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
      <section className="desk-form pad" id="brief-sheet">
        <aside className="form-aside">
          <span className="micro">{c.micro}</span>
          <p className="ask">Brief received.<br />Thank you.</p>
          <p className="body-copy">{contact.response.rows[0].p}</p>
        </aside>
        <div className="form-sheet" style={{ border: 0 }}>
          <div className="callout" style={{ marginTop: 0 }}>
            <b>Sent — a real reply is next</b>
            We've got your brief. Expect a reply from the person who'd actually do the work — usually under one business day.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="desk-form pad" id="brief-sheet">
      <aside className="form-aside">
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask[0]}<br />{c.ask[1]}<br />{c.ask[2]}</p>
        <p className="body-copy">{c.copy}</p>
        <div className="form-photo"><div className="imgph">{c.photoNote}</div></div>
        <p className="form-note"><b>Your details stay private.</b> Used only to reply to this enquiry — see the Privacy Policy. No lists, no spam, no sharing.</p>
      </aside>
      <form className="form-sheet" onSubmit={onSubmit} noValidate>
        {/* honeypot — hidden from humans, tempting for bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off"
               aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

        <div className="f-row">
          <div className="lab">{f.name.label}<small>{f.name.hint}</small></div>
          <div className="field">
            <input type="text" name="name" placeholder={f.name.placeholder} required />
            {errors.name && <p className="f-error">{errors.name}</p>}
          </div>
        </div>
        <div className="f-split">
          <div className="col">
            <div className="f-row">
              <div className="lab">{f.phone.label}<small>{f.phone.hint}</small></div>
              <div className="field">
                <input type="tel" name="phone" placeholder={f.phone.placeholder} />
                {errors.phone && <p className="f-error">{errors.phone}</p>}
              </div>
            </div>
          </div>
          <div className="col">
            <div className="f-row">
              <div className="lab">{f.email.label}<small>{f.email.hint}</small></div>
              <div className="field">
                <input type="email" name="email" placeholder={f.email.placeholder} />
                {errors.email && <p className="f-error">{errors.email}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="f-row">
          <div className="lab">{f.service.label}<small>{f.service.hint}</small></div>
          <div className="field">
            <select name="service" defaultValue="">
              <option value="">{f.service.placeholder}</option>
              {f.service.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="f-row">
          <div className="lab">{f.budget.label}<small>{f.budget.hint}</small></div>
          <div className="field">
            <select name="budget" defaultValue="">
              <option value="">{f.budget.placeholder}</option>
              {f.budget.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="f-row">
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
      </form>
    </section>
  );
}
