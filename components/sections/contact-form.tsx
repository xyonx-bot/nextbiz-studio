"use client";

import { useEffect, useRef, useState } from "react";
import { WHATSAPP_URL, CONTACT } from "@/lib/content";
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
  const [sent, setSent] = useState<null | { name: string; via: "whatsapp" | "email" }>(null);
  const done = useRef<HTMLDivElement>(null);
  const errBox = useRef<HTMLDivElement>(null);
  // bring the confirmation (or the error) into view and announce it, wherever the visitor had scrolled to
  useEffect(() => { if (sent) { done.current?.scrollIntoView({ behavior: "smooth", block: "center" }); done.current?.focus({ preventScroll: true }); } }, [sent]);
  useEffect(() => { if (formError) errBox.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [formError]);

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
    const wantsUpdates = fd.get("updates") === "on";

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        // the opt-in box: add their email to the newsletter list (best effort — the brief is already sent)
        if (wantsUpdates && payload.email.includes("@")) {
          fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: payload.email, list: "newsletter", source: "contact-form" }) }).catch(() => {});
        }
        setSent({ name: payload.name.trim().split(/\s+/)[0] || "", via: payload.phone.trim().length >= 7 ? "whatsapp" : "email" });
        return;
      }
      if (data?.errors) {
        setErrors(data.errors);
        // take the visitor to the first field that needs fixing
        requestAnimationFrame(() => document.querySelector<HTMLElement>(".cf-fld.err :is(input, select, textarea)")?.focus());
      }
      if (!data?.errors) setFormError(data?.error ?? "Something went wrong — please try again, or just call us.");
    } catch {
      setFormError("Network hiccup — please try again, or just call us.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="form-sheet f-done-wrap" id="brief-sheet">
        <div className="f-done" ref={done} tabIndex={-1} role="status" aria-live="polite">
          <span className="f-done-ic" aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
          <h3>{sent.name ? `Thanks, ${sent.name}. Your brief is in.` : "Thanks. Your brief is in."}</h3>
          <p>We&apos;ll read it today and reply {sent.via === "whatsapp" ? "on WhatsApp" : "by email"} within one business day, from the person who&apos;d actually do the work.</p>
          <ol className="f-done-steps">
            <li><b>Today</b><span>We read your brief</span></li>
            <li><b>Within a day</b><span>A real reply, with first thoughts</span></li>
            <li><b>Next</b><span>A 15-minute call, if it helps</span></li>
          </ol>
          <div className="f-done-acts">
            <a className="cf-submit" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Talk sooner on WhatsApp</a>
            <a className="f-done-link" href={`tel:${CONTACT.phoneTel}`}>or call {CONTACT.phoneDisplay}</a>
          </div>
          <button type="button" className="f-done-again" onClick={() => setSent(null)}>Send another brief</button>
        </div>
      </div>
    );
  }

  const fld = (key: string, field: { label: string; hint?: string }, control: React.ReactNode, opts: { full?: boolean; optional?: boolean; err?: string } = {}) => (
    <div className={`cf-fld${opts.full ? " full" : ""}${opts.err ? " err" : ""}`}>
      <label htmlFor={`cf-${key}`}>{field.label}{opts.optional ? <span className="cf-opt"> (optional)</span> : null}</label>
      {control}
      {opts.err ? <p className="cf-msg" id={`cf-${key}-err`}>{opts.err}</p> : field.hint ? <p className="cf-help">{field.hint}</p> : null}
    </div>
  );

  return (
    <form className="cform" onSubmit={onSubmit} noValidate>
      {/* honeypot — hidden from humans, tempting for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
             aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
      <div className="cf-head"><h2>Send us a brief</h2><p>{c.hint}</p></div>
      <div className="cf-grid">
        {fld("name", f.name, <input className="cf-ctl" id="cf-name" type="text" name="name" autoComplete="name" placeholder={f.name.placeholder} required aria-invalid={!!errors.name} />, { full: true, err: errors.name })}
        {fld("phone", f.phone, <input className="cf-ctl" id="cf-phone" type="tel" inputMode="tel" name="phone" autoComplete="tel" placeholder={f.phone.placeholder} aria-invalid={!!errors.phone} />, { err: errors.phone })}
        {fld("email", f.email, <input className="cf-ctl" id="cf-email" type="email" name="email" autoComplete="email" placeholder={f.email.placeholder} aria-invalid={!!errors.email} />, { err: errors.email })}
        {fld("service", f.service, (
          <select className="cf-ctl" id="cf-service" name="service" defaultValue="">
            <option value="">{f.service.placeholder}</option>
            {f.service.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ), { err: errors.service })}
        {fld("budget", f.budget, (
          <select className="cf-ctl" id="cf-budget" name="budget" defaultValue="">
            <option value="">{f.budget.placeholder}</option>
            {f.budget.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ), { optional: true, err: errors.budget })}
        {fld("brief", f.brief, <textarea className="cf-ctl" id="cf-brief" name="brief" placeholder={f.brief.placeholder} required aria-invalid={!!errors.message} />, { full: true, err: errors.message })}
      </div>

      {formError && <div className="cf-alert" ref={errBox} role="alert"><b>Couldn&apos;t send.</b> {formError}</div>}

      <label className="cf-check" htmlFor="cf-updates"><input type="checkbox" id="cf-updates" name="updates" /><span>{c.checkText}</span></label>
      <div className="cf-actions">
        <p className="cf-note">Private. Used only to reply to you. No lists, no spam.</p>
        <button className="cf-submit" type="submit" disabled={sending}>{sending ? "Sending…" : c.submit}</button>
      </div>
    </form>
  );
}
