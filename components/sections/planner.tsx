"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SIZES, TIERS, WHEN, buildPlan, inr, planText, scopeOf, type Answers, type Pricing, type ProjectType } from "@/lib/planner-core";

/**
 * /plan — the project planner. Five quick steps, a preview that builds itself as features are picked,
 * then three options (never one price). Saving sends the plan to the studio as a lead; the server
 * recomputes it from the admin's pricing, so nothing the browser sends can change the numbers.
 */
type Preset = { size?: string; industry?: string; when?: string };
type Props = { pricing: Pricing; industries: string[]; start?: string; preset?: Preset; wa: string };
const STEPS = ["What", "About you", "Scope", "When", "Budget"] as const;
const ICON: Record<ProjectType["id"], string> = {
  website: "M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01",
  store: "M4 7h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7zM9 7a3 3 0 0 1 6 0",
  whatsapp: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z",
  instagram: "M4 4h16v16H4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 7h.01",
  custom: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z",
};
const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;

export function Planner({ pricing, industries, start, preset = {}, wa }: Props) {
  const types = pricing.types;
  const first = types.find((t) => t.id === start);
  // the homepage sentence sends size/industry/when too: only accept known values, and skip to Must-haves when "About you" is answered
  const size = SIZES.some((s) => s.id === preset.size) ? preset.size! : "";
  const industry = industries.includes(preset.industry ?? "") ? preset.industry! : "";
  const when = WHEN.some((w) => w.id === preset.when) ? preset.when! : "normal";
  const [step, setStep] = useState(first ? (size ? 2 : 1) : 0);
  const [a, setA] = useState<Answers>(() => ({ type: first?.id ?? "website", industry, size, features: [...(first ?? types[0]).tiers.lean.includes], when, budget: "" }));
  const [done, setDone] = useState(false);
  const type = types.find((t) => t.id === a.type) ?? types[0];
  const plan = useMemo(() => buildPlan(pricing, a), [pricing, a]);
  const top = useRef<HTMLDivElement>(null);
  const go = (n: number) => { setStep(n); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const pickType = (id: ProjectType["id"]) => { const t = types.find((x) => x.id === id)!; setA((v) => ({ ...v, type: id, features: [...t.tiers.lean.includes], scope: {} })); go(1); };
  const toggle = (id: string) => setA((v) => ({ ...v, features: v.features.includes(id) ? v.features.filter((x) => x !== id) : [...v.features, id] }));
  const canNext = [true, !!a.size, true, !!a.when, !!a.budget][step];
  const showResult = step >= STEPS.length;

  return (
    <div className="pl" ref={top}>
      <div className="pl-main">
        {!showResult ? (
          <div className="pl-card" key={step}>
            <div className="pl-prog" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => <button key={s} type="button" className={i < step ? "done" : i === step ? "on" : ""} onClick={() => i < step && go(i)} disabled={i > step}><i />{s}</button>)}
            </div>

            {step === 0 && (<>
              <h2>What are we building?</h2>
              <div className="pl-types">
                {types.map((t) => (
                  <button key={t.id} type="button" className={`pl-type${a.type === t.id ? " on" : ""}`} onClick={() => pickType(t.id)}>
                    <span className="ic"><Ico d={ICON[t.id]} /></span><b>{t.label}</b><small>{t.blurb}</small>
                  </button>
                ))}
              </div>
            </>)}

            {step === 1 && (<>
              <h2>Tell us about your business</h2>
              <p className="pl-q">Your industry <small>optional</small></p>
              <div className="pl-chips">
                {industries.map((x) => <button key={x} type="button" className={a.industry === x ? "on" : ""} onClick={() => setA((v) => ({ ...v, industry: v.industry === x ? "" : x }))}>{x}</button>)}
              </div>
              <p className="pl-q">How big is the team?</p>
              <div className="pl-chips big">
                {SIZES.map((s) => <button key={s.id} type="button" className={a.size === s.id ? "on" : ""} onClick={() => setA((v) => ({ ...v, size: s.id }))}>{s.label}</button>)}
              </div>
            </>)}

            {step === 2 && (<>
              <h2>Size it, then pick your must-haves</h2>
              <p className="pl-sub">A few quick choices, then tick what you need. Watch your {type.id === "whatsapp" ? "chat" : type.id === "instagram" ? "profile" : "site"} build itself.</p>
              <div className="pl-scope">
                {scopeOf(type, a.scope).chosen.map(({ group: g, opt: cur }) => (
                  <div className="pl-sq" key={g.id} role="radiogroup" aria-label={g.q}>
                    <p className="pl-q">{g.q}</p>
                    <div className="pl-seg">
                      {g.opts.map((o) => (
                        <button key={o.id} type="button" role="radio" aria-checked={cur.id === o.id} className={cur.id === o.id ? "on" : ""}
                          onClick={() => setA((v) => ({ ...v, scope: { ...(v.scope ?? {}), [g.id]: o.id } }))}>
                          {o.label}{pricing.showPrices && o.price > 0 ? <small>+{inr(o.price)}{type.monthly ? "/mo" : ""}</small> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="pl-q">Must-haves</p>
              <div className="pl-feats">
                {type.features.map((x) => (
                  <label key={x.id} className={`pl-feat${a.features.includes(x.id) ? " on" : ""}`}>
                    <input type="checkbox" checked={a.features.includes(x.id)} onChange={() => toggle(x.id)} />
                    <span className="box" aria-hidden />
                    <span><b>{x.label}</b><small>{x.hint}</small></span>
                  </label>
                ))}
              </div>
            </>)}

            {step === 3 && (<>
              <h2>When do you need it?</h2>
              <div className="pl-when">
                {WHEN.map((w) => (
                  <button key={w.id} type="button" className={a.when === w.id ? "on" : ""} onClick={() => setA((v) => ({ ...v, when: w.id }))}>
                    <b>{w.label}</b><small>{w.id === "asap" ? `We'll move faster — adds about ${pricing.rushPct}%` : w.id === "relaxed" ? "Plenty of time to get it just right" : "The usual pace"}</small>
                  </button>
                ))}
              </div>
            </>)}

            {step === 4 && (<>
              <h2>What budget feels comfortable?</h2>
              <p className="pl-sub">This only shapes our suggestion. You'll still see every option.</p>
              {pricing.showPrices && <p className="pl-hint">For what you picked, the smallest version starts from <b>{inr(plan.core)}{type.monthly ? "/mo" : ""}</b>{plan.options[0].price > plan.core ? <> — or <b>{inr(plan.options[0].price)}</b> with all your must-haves</> : null}.</p>}
              <div className="pl-chips big">
                {pricing.budgets.map((b) => <button key={b.id} type="button" className={a.budget === b.id ? "on" : ""} onClick={() => setA((v) => ({ ...v, budget: b.id }))}>{b.label}{type.monthly && b.id !== "unsure" ? " /mo" : ""}</button>)}
              </div>
            </>)}

            <div className="pl-nav">
              {step > 0 && <button type="button" className="pl-back" onClick={() => go(step - 1)}>← Back</button>}
              <span className="sp" />
              {step > 0 && <button type="button" className="action dark" disabled={!canNext} onClick={() => go(step + 1)}>{step === STEPS.length - 1 ? "See my plan" : "Next"} <Arrow /></button>}
            </div>
          </div>
        ) : (
          <Result pricing={pricing} a={a} plan={plan} wa={wa} done={done} setDone={setDone} edit={() => go(2)} restart={() => { setDone(false); go(0); }}
            switchTo={(id) => { const t = types.find((x) => x.id === id)!; setA((v) => ({ ...v, type: id, features: [...t.tiers.lean.includes], scope: {} })); go(2); }} />
        )}
      </div>
      <aside className="pl-side" aria-label="Live preview"><Preview type={type} features={a.features} industry={a.industry} /></aside>
    </div>
  );
}

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

function Result({ pricing, a, plan, wa, done, setDone, edit, restart, switchTo }: { pricing: Pricing; a: Answers; plan: ReturnType<typeof buildPlan>; wa: string; done: boolean; setDone: (v: boolean) => void; edit: () => void; restart: () => void; switchTo: (id: ProjectType["id"]) => void }) {
  const [busy, setBusy] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (done) { doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); doneRef.current?.focus({ preventScroll: true }); } }, [done]);
  const [err, setErr] = useState("");
  const per = plan.type.monthly ? "/month" : "";
  const text = planText(plan, a, pricing.showPrices);
  const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent(`Hi NextBiz Studio! I planned my project on your site:\n\n${text}`)}`;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), website: fd.get("website"), answers: a }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (d?.ok) setDone(true); else setErr(d?.error ?? "Couldn't send — try WhatsApp instead.");
  }
  return (
    <div className="pl-result">
      <div className="pl-rhead">
        <span className="pl-eb">Your plan · {plan.type.label}{a.industry ? ` for ${a.industry}` : ""}</span>
        {plan.type.scope.length > 0 && <div className="pl-scope-sum">{scopeOf(plan.type, a.scope).chosen.map((c) => <span key={c.group.id}>{c.opt.label}</span>)}</div>}
        <h2>Three ways to do it</h2>
        <p className="pl-sub">{pricing.showPrices ? "Starting prices — your exact quote comes after a 15-minute call." : "Your exact quote comes after a 15-minute call."}</p>
      </div>
      <div className="pl-opts">
        {plan.options.map((o) => (
          <div key={o.tier} className={`pl-opt${o.tier === plan.recommended ? " rec" : ""}`}>
            <div className="top"><b>{o.name}</b>{o.tier === plan.recommended ? <span className="pick">Best fit for you</span> : <small>{o.tag}</small>}</div>
            {pricing.showPrices && <div className="price"><small>from</small> {inr(o.price)}<small>{per}</small></div>}
            <div className="weeks">{plan.type.monthly ? `Starts in ${o.weeks} week${o.weeks > 1 ? "s" : ""}` : `About ${o.weeks} week${o.weeks > 1 ? "s" : ""}`}</div>
            <ul>
              {o.features.map((x) => <li key={x.id}>{x.label}</li>)}
              {o.extras.map((x) => <li key={x.id} className="extra">{x.label}<small>added for you</small></li>)}
            </ul>
            {o.later.length > 0 && <div className="later"><span>Phase 2 · later</span>{o.later.map((x) => <em key={x.id}>{x.label}</em>)}</div>}
          </div>
        ))}
      </div>
      {plan.tight ? (
        <div className="pl-phase tight">
          <b>Honest note:</b> {plan.budgetLabel} is tight for {plan.type.label.toLowerCase()} — the smallest version starts from {inr(plan.core)}.
          {plan.alt && <> A good way in: <b>{plan.alt.label}</b> from {inr(plan.alt.price)}, then grow from there. <button type="button" onClick={() => switchTo(plan.alt!.id)}>Plan {plan.alt.label.toLowerCase()} instead →</button></>}
        </div>
      ) : plan.phased ? (
        <p className="pl-phase"><b>To fit your budget</b>, Lean starts with the essentials and we add {plan.options[0].later.map((x) => x.label).join(", ")} in a second phase, once it starts paying off.</p>
      ) : null}
      {pricing.placeholder && <p className="pl-ph">Sample prices for the preview — real prices are set by the studio.</p>}

      <div className="pl-send">
        {done ? (
          <div className="pl-done" ref={doneRef} tabIndex={-1} role="status"><b>Got it — your plan is with us.</b><span>We'll reply within a few hours. Want to talk now?</span><a className="action dark" href={waUrl} target="_blank" rel="noreferrer">Chat on WhatsApp <Arrow /></a></div>
        ) : (<>
          <div className="pl-send-l">
            <div className="pl-send-h"><b>Get this plan and a quick call</b><span>We&apos;ll look at it and reply with real numbers, usually within a day. No spam, ever.</span></div>
            <div className="pl-alt"><a href={waUrl} target="_blank" rel="noreferrer">Or send it on WhatsApp →</a><a href="/contact">Book a call →</a></div>
          </div>
          <form onSubmit={submit} className="pl-form">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="pl-hp" aria-hidden />
            <label><span>Your name</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
            <label><span>WhatsApp / phone</span><input name="phone" type="tel" maxLength={24} placeholder="+91 …" autoComplete="tel" /></label>
            <label><span>Email <small>optional</small></span><input name="email" type="email" maxLength={160} autoComplete="email" /></label>
            <button className="action dark" type="submit" disabled={busy}>{busy ? "Sending…" : "Send me this plan"} <Arrow /></button>
          </form>
          {err && <p className="pl-err" role="alert">{err}</p>}
        </>)}
      </div>
      <div className="pl-again"><button type="button" onClick={edit}>← Change scope & must-haves</button><button type="button" onClick={restart}>Start over</button></div>
    </div>
  );
}

/* ── the live preview: a tiny mock that grows with every tick ── */
function Preview({ type, features, industry }: { type: ProjectType; features: string[]; industry: string }) {
  const has = (id: string) => features.includes(id);
  const name = industry && industry !== "and More" ? `Your ${industry.split(" ")[0].toLowerCase()} brand` : "Your brand";
  const [bump, setBump] = useState(0);
  useEffect(() => setBump((b) => b + 1), [features.length]);
  if (type.id === "whatsapp") return (
    <div className="pv phone" data-bump={bump}>
      <div className="pv-wa-top"><i />{name}<small>online</small></div>
      <div className="pv-chat">
        <span className="in">Hi! What's the price?</span>
        {has("auto") && <span className="out pop">Hi 👋 Thanks for messaging! Here's our price list…</span>}
        {has("catalog") && <span className="out pop card"><i />Product · ₹1,299<small>View · Add to cart</small></span>}
        {has("ai") && <span className="out pop">✨ The large one suits a 2BHK best — shall I reserve it?</span>}
        {has("bcast") && <span className="out pop offer">🎉 Weekend offer: 20% off for you</span>}
        {has("ads") && <span className="sys pop">Came from your Instagram ad</span>}
      </div>
      {has("crm") && <div className="pv-sheet pop"><b>New lead saved</b><span>Priya · price enquiry · 2 min ago</span></div>}
    </div>
  );
  if (type.id === "instagram") return (
    <div className="pv phone" data-bump={bump}>
      <div className="pv-ig-top"><span className="av" /><span><b>{name.toLowerCase().replace(/\s+/g, ".")}</b><small>Profile</small></span></div>
      <div className="pv-grid">{Array.from({ length: 9 }, (_, i) => <span key={i} className={has("reels") && i % 3 === 1 ? "reel" : has("shoot") && i === 4 ? "shot" : ""} />)}</div>
      {has("dm") && <div className="pv-dm pop">💬 “PRICE” → sent you the details in DM</div>}
      {has("ads") && <div className="pv-dm pop ad">Sponsored · reaching 12k people near you</div>}
    </div>
  );
  return (
    <div className="pv browser" data-bump={bump}>
      <div className="pv-bar"><i /><i /><i /><span>{name.toLowerCase().replace(/\s+/g, "")}.com</span></div>
      <div className="pv-nav"><b>{name}</b><span />{has("lang") && <em className="pop">EN · हिं</em>}{type.id === "store" && <em className="pop cart">Cart 2</em>}</div>
      <div className={`pv-hero${has("anim") ? " shine" : ""}`}><b /><b className="s" />{has("cms") && <em className="pop">✎ Edit</em>}</div>
      {type.id === "store" && <div className="pv-prods">{[0, 1, 2].map((i) => <span key={i}><i />{has("reviews") && <small className="pop">★★★★★</small>}{has("inv") && <small className="pop ok">In stock</small>}</span>)}</div>}
      {type.id === "store" && has("coupons") && <div className="pv-strip pop">Use code WELCOME10</div>}
      {type.id === "store" && has("track") && <div className="pv-track pop"><i /><i /><i className="off" /><small>Out for delivery</small></div>}
      {has("form") && <div className="pv-form pop"><span /><span /><b>Send enquiry</b></div>}
      {has("booking") && <div className="pv-cal pop">{Array.from({ length: 14 }, (_, i) => <span key={i} className={i === 9 ? "on" : ""} />)}</div>}
      {has("pay") && type.id !== "store" && <div className="pv-pay pop">UPI · Cards · <b>Pay ₹</b></div>}
      {has("blog") && <div className="pv-blog pop"><span /><span /><span /></div>}
      {(has("login") || has("admin")) && <div className="pv-dash pop"><span className="side" /><span className="main" /></div>}
      {has("app") && <div className="pv-app pop" />}
      {has("seo") && <div className="pv-seo pop"><small>Google</small><b>{name} — best in your area</b></div>}
      {has("wa") && <span className="pv-wab pop" aria-hidden>💬</span>}
    </div>
  );
}
