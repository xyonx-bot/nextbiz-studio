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
export function DeskForm({ content, variant = "classic" }: { content?: typeof contact.deskForm; variant?: "classic" | "sheet" }) {
  const c = content ?? contact.deskForm;
  const f = c.fields;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | { name: string; via: "whatsapp" | "email"; self?: boolean }>(null);
  // self-service: "no calls, everything in the portal". ?mode=self (or #self-service) preselects it — for reels / links
  const [self, setSelf] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("mode") === "self" || location.hash === "#self-service") setSelf(true);
  }, []);
  const [pick, setPick] = useState<{ service: string; budget: string }>({ service: "", budget: "" });
  // live "your brief so far" summary (Editorial sheet) — read from the form as the visitor types
  const [draft, setDraft] = useState({ name: "", contact: "", words: 0 });
  const readDraft = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    setDraft({ name: v("name"), contact: v("phone") || v("email"), words: v("brief").split(/\s+/).filter(Boolean).length });
  };
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
      website: String(fd.get("nb_trap") ?? ""), // honeypot (named nb_trap so browser autofill never fills it)
      selfService: self,
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
        setSent({ name: payload.name.trim().split(/\s+/)[0] || "", via: self ? "email" : payload.phone.trim().length >= 7 ? "whatsapp" : "email", self });
        return;
      }
      if (data?.errors) {
        setErrors(data.errors);
        // take the visitor to the first field that needs fixing
        requestAnimationFrame(() => document.querySelector<HTMLElement>(":is(.cf-fld, .cs-cell).err :is(input, select, textarea)")?.focus());
      }
      if (!data?.errors) setFormError(data?.error ?? "Something went wrong — please try again, or just call us.");
    } catch {
      setFormError("Network hiccup — please try again, or just call us.");
    } finally {
      setSending(false);
    }
  }


  const modeChoice = (
    <div className="cf-mode" role="radiogroup" aria-label="How would you like to work with us?">
      <span className="cf-mode-l">How would you like to work?</span>
      <div className="cf-mode-opts">
        <button type="button" role="radio" aria-checked={!self} className={!self ? "on" : ""} onClick={() => setSelf(false)}>
          <b>Talk it through</b><small>A quick reply on WhatsApp or a short call</small></button>
        <button type="button" role="radio" aria-checked={self} className={self ? "on" : ""} onClick={() => setSelf(true)}>
          <b>Self-service · no calls</b><small>Everything in your private portal: chat, files, payments</small></button>
      </div>
    </div>
  );

  if (sent) {
    return (
      <div className="form-sheet f-done-wrap" id="brief-sheet">
        <div className="f-done" ref={done} tabIndex={-1} role="status" aria-live="polite">
          <span className="f-done-ic" aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
          <h3>{sent.name ? `Thanks, ${sent.name}. Your brief is in.` : "Thanks. Your brief is in."}</h3>
          {sent.self ? (<>
            <p>You chose self-service: no calls. We&apos;ll review your request within one business day. If we can take it on, you&apos;ll get an email invite to your private client portal, where everything happens.</p>
            <ol className="f-done-steps">
              <li><b>Within a day</b><span>We review your request</span></li>
              <li><b>If it&apos;s a fit</b><span>Your portal invite arrives by email</span></li>
              <li><b>Then</b><span>Brief, files, updates and payments, all in the portal</span></li>
            </ol>
          </>) : (<>
            <p>We&apos;ll read it today and reply {sent.via === "whatsapp" ? "on WhatsApp" : "by email"} within one business day, from the person who&apos;d actually do the work.</p>
            <ol className="f-done-steps">
              <li><b>Today</b><span>We read your brief</span></li>
              <li><b>Within a day</b><span>A real reply, with first thoughts</span></li>
              <li><b>Next</b><span>A 15-minute call, if it helps</span></li>
            </ol>
          </>)}
          <div className="f-done-acts">
            <a className="cf-submit" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Talk sooner on WhatsApp</a>
            <a className="f-done-link" href={`tel:${CONTACT.phoneTel}`}>or call {CONTACT.phoneDisplay}</a>
          </div>
          <button type="button" className="f-done-again" onClick={() => setSent(null)}>Send another brief</button>
        </div>
      </div>
    );
  }

  if (variant === "sheet") {
    // Editorial "ruled sheet": every field is a hairline cell; options are joined cells that fill lime
    const cell = (key: string, label: string, control: React.ReactNode, opts: { cls?: string; err?: string; note?: string } = {}) => (
      <div className={`cs-cell${opts.cls ? ` ${opts.cls}` : ""}${opts.err ? " err" : ""}`}>
        <label htmlFor={`cs-${key}`}>{label}{opts.note ? <span className="cs-note"> {opts.note}</span> : null}</label>
        {control}
        {opts.err ? <p className="cs-msg">{opts.err}</p> : null}
      </div>
    );
    const options = (key: "service" | "budget", list: string[]) => (
      <div className={`cs-opts n${list.length}`} role="radiogroup" aria-labelledby={`cs-${key}-l`}>
        {list.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={pick[key] === o} className={pick[key] === o ? "on" : ""}
            onClick={() => setPick((v) => ({ ...v, [key]: v[key] === o ? "" : o }))}>{o}</button>
        ))}
        <input type="hidden" name={key} value={pick[key]} />
      </div>
    );
    return (
      <div className="cs-layout">
      <form className="csheet-form" onSubmit={onSubmit} onInput={(e) => readDraft(e.currentTarget)} noValidate>
        <input type="text" name="nb_trap" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
        {modeChoice}
        <div className="cs-grid">
          {cell("name", f.name.label, <input id="cs-name" name="name" type="text" autoComplete="name" placeholder={f.name.placeholder} aria-invalid={!!errors.name} />, { cls: "w6", err: errors.name })}
          {cell("phone", f.phone.label, <input id="cs-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={f.phone.placeholder} aria-invalid={!!errors.phone} />, { cls: "w3", err: errors.phone })}
          {cell("email", f.email.label, <input id="cs-email" name="email" type="email" autoComplete="email" placeholder={f.email.placeholder} aria-invalid={!!errors.email} />, { cls: "w3 end", note: "(or phone)", err: errors.email })}
          <div className="cs-cell w6"><span className="cs-l" id="cs-service-l">{f.service.label}</span>{options("service", f.service.options)}</div>
          <div className="cs-cell w6"><span className="cs-l" id="cs-budget-l">{f.budget.label} <span className="cs-note">(optional)</span></span>{options("budget", f.budget.options)}</div>
          {cell("brief", f.brief.label, <textarea id="cs-brief" name="brief" placeholder={f.brief.placeholder} aria-invalid={!!errors.message} />, { cls: "w6", err: errors.message })}
        </div>
        {formError && <div className="cf-alert cs-alert" ref={errBox} role="alert"><b>Couldn&apos;t send.</b> {formError}</div>}
        <div className="cs-send">
          <label className="cf-check" htmlFor="cs-updates"><input type="checkbox" id="cs-updates" name="updates" /><span>{c.checkText}</span></label>
          <div className="cs-go"><span className="cf-note">Private. Used only to reply to you. No lists, no spam.</span>
            <button className="action dark cs-submit" type="submit" disabled={sending}>{sending ? "Sending…" : c.submit.replace(/\s*→\s*$/, "")} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </form>
      <aside className="cs-aside" aria-label="Your brief so far">
        <div className="cs-sum">
          <span className="micro">Your brief so far</span>
          <ul>
            {([
              ["Name", draft.name],
              ["Contact", draft.contact],
              ["Need", pick.service],
              ["Budget", pick.budget || ""],
              ["Brief", draft.words ? `${draft.words} word${draft.words > 1 ? "s" : ""}` : ""],
            ] as [string, string][]).map(([k, v]) => (
              <li key={k} className={v ? "ok" : ""}><span>{k}</span><b>{v || "—"}</b></li>
            ))}
          </ul>
          <p className="cs-ready">{draft.name && draft.contact && draft.words >= 3 ? "Ready to send." : "Name, a way to reach you and a few words is all we need."}</p>
        </div>
        <div className="cs-alt">
          <span className="micro">Rather not type?</span>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><b>WhatsApp us</b><span>Usually within an hour</span></a>
          <a href={`tel:${CONTACT.phoneTel}`}><b>Call {CONTACT.phoneDisplay}</b><span>Mon–Sat, 10:00–19:00</span></a>
          <a href="/plan"><b>Use the project planner</b><span>Three options with prices, in a minute</span></a>
        </div>
        <ul className="cs-promise">
          <li>Reply within 1 business day</li>
          <li>From the person doing the work</li>
          <li>No sales script, no spam</li>
        </ul>
      </aside>
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
      <input type="text" name="nb_trap" tabIndex={-1} autoComplete="off"
             aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
      <div className="cf-head"><h2>Send us a brief</h2><p>{c.hint}</p></div>
      {modeChoice}
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
