"use client";

import { useState, useTransition } from "react";
import { savePlannerAction } from "@/app/admin/actions";
import { TIERS, inr, type Pricing } from "@/lib/planner-core";

/** Prices and timelines behind /plan. Every price is a "from" price; visitors always see three options. */
export function PlannerPricing({ initial }: { initial: Pricing }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const n = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const setTier = (ti: number, tier: string, k: "price" | "weeks", v: string) => setP((x) => ({ ...x, types: x.types.map((t, i) => i !== ti ? t : { ...t, tiers: { ...t.tiers, [tier]: { ...t.tiers[tier as keyof typeof t.tiers], [k]: n(v) } } }) }));
  const setFeat = (ti: number, fi: number, k: "price" | "weeks", v: string) => setP((x) => ({ ...x, types: x.types.map((t, i) => i !== ti ? t : { ...t, features: t.features.map((f, j) => j !== fi ? f : { ...f, [k]: n(v) }) }) }));
  const setScope = (ti: number, gi: number, oi: number, k: "price" | "weeks", v: string) => setP((x) => ({ ...x, types: x.types.map((t, i) => i !== ti ? t : { ...t, scope: t.scope.map((g, j) => j !== gi ? g : { ...g, opts: g.opts.map((o, m) => m !== oi ? o : { ...o, [k]: n(v) }) }) }) }));
  const setBudget = (i: number, k: "label" | "max", v: string) => setP((x) => ({ ...x, budgets: x.budgets.map((b, j) => j !== i ? b : k === "label" ? { ...b, label: v } : { ...b, max: n(v) }) }));
  const save = () => start(async () => { const r = await savePlannerAction(p); setP((x) => ({ ...x, placeholder: false })); setMsg(r.message); });
  return (
    <div className="pp">
      {p.placeholder && <div className="pp-warn"><b>These are sample prices.</b> Set your real starting prices below and press Save. Until then, visitors see a note that prices are samples.</div>}
      <section className="dz-card">
        <h2>How prices show</h2>
        <label className="dz-toggle" htmlFor="pp-show"><span><b>Show “from ₹” prices to visitors</b><small>Off: visitors see the three options and timelines only, and you send prices after the call.</small></span>
          <input id="pp-show" type="checkbox" checked={p.showPrices} onChange={(e) => setP({ ...p, showPrices: e.target.checked })} /><i aria-hidden /></label>
        <label className="dz-field" htmlFor="pp-rush" style={{ maxWidth: 220 }}><span>Rush fee for “ASAP” (%)</span><input id="pp-rush" type="number" min={0} max={200} value={p.rushPct} onChange={(e) => setP({ ...p, rushPct: n(e.target.value) })} /></label>
      </section>
      <section className="dz-card">
        <h2>Budget choices</h2>
        <p className="dz-sub">The ranges visitors pick from in the planner. “Up to” is the top of each range in ₹ (0 means no upper limit). The planner recommends the biggest option that fits it. The contact form&apos;s budget list is edited in Pages → Contact.</p>
        <div className="pp-grid">
          <span className="h">Label</span><span className="h">Up to ₹</span><span className="h"></span>
          {p.budgets.map((b, i) => (
            <div key={b.id} style={{ display: "contents" }}>
              <input type="text" maxLength={40} value={b.label} onChange={(e) => setBudget(i, "label", e.target.value)} aria-label={`Budget ${i + 1} label`} />
              {b.max === null
                ? <span><small>No range (“not sure”)</small></span>
                : <input type="number" min={0} step={1000} value={b.max} onChange={(e) => setBudget(i, "max", e.target.value)} aria-label={`${b.label} up to`} />}
              <span><small>{b.max === null ? "" : b.max === 0 ? "no upper limit" : `shows up to ${inr(b.max)}`}</small></span>
            </div>
          ))}
        </div>
      </section>
      {p.types.map((t, ti) => (
        <section className="dz-card" key={t.id}>
          <h2>{t.label} <em>{t.monthly ? "monthly prices" : "one-time prices"}</em></h2>
          <div className="pp-tiers">
            {TIERS.map(({ id, name }) => (
              <div key={id} className="pp-tier"><b>{name}</b>
                <label><span>From ₹</span><input type="number" min={0} step={1000} value={t.tiers[id].price} onChange={(e) => setTier(ti, id, "price", e.target.value)} aria-label={`${t.label} ${name} price`} /></label>
                <label><span>{t.monthly ? "Starts in (weeks)" : "Weeks"}</span><input type="number" min={1} max={104} value={t.tiers[id].weeks} onChange={(e) => setTier(ti, id, "weeks", e.target.value)} aria-label={`${t.label} ${name} weeks`} /></label>
                <small>Shows as {inr(t.tiers[id].price)}{t.monthly ? "/mo" : ""}</small>
              </div>
            ))}
          </div>
          <details className="pp-feats"><summary>Sizing answers ({t.scope.length} questions) — the visitor picks one answer per question; it&apos;s added to all three options</summary>
            <div className="pp-grid">
              <span className="h">Question · answer</span><span className="h">+ ₹</span><span className="h">+ weeks</span>
              {t.scope.map((g, gi) => g.opts.map((o, oi) => (
                <div key={`${g.id}-${o.id}`} style={{ display: "contents" }}>
                  <span>{o.label}<small>{g.q}{oi === 0 ? " · default answer" : ""}</small></span>
                  <input type="number" min={0} step={1000} value={o.price} onChange={(e) => setScope(ti, gi, oi, "price", e.target.value)} aria-label={`${g.q} ${o.label} price`} />
                  <input type="number" min={0} max={52} value={o.weeks} onChange={(e) => setScope(ti, gi, oi, "weeks", e.target.value)} aria-label={`${g.q} ${o.label} weeks`} />
                </div>
              )))}
            </div>
          </details>
          <details className="pp-feats"><summary>Add-on prices ({t.features.length} features) — charged when a visitor picks one that an option doesn&apos;t include</summary>
            <div className="pp-grid">
              <span className="h">Feature</span><span className="h">+ ₹</span><span className="h">+ weeks</span>
              {t.features.map((f, fi) => (
                <div key={f.id} style={{ display: "contents" }}>
                  <span>{f.label}<small>{TIERS.filter(({ id }) => t.tiers[id].includes.includes(f.id)).map((x) => x.name).join(", ") ? `Included in ${TIERS.filter(({ id }) => t.tiers[id].includes.includes(f.id)).map((x) => x.name).join(", ")}` : "Never included"}</small></span>
                  <input type="number" min={0} step={1000} value={f.price} onChange={(e) => setFeat(ti, fi, "price", e.target.value)} aria-label={`${f.label} price`} />
                  <input type="number" min={0} max={52} value={f.weeks} onChange={(e) => setFeat(ti, fi, "weeks", e.target.value)} aria-label={`${f.label} weeks`} />
                </div>
              ))}
            </div>
          </details>
        </section>
      ))}
      <div className="pp-save"><span>{msg}</span><a href="/plan" target="_blank" rel="noreferrer">Open the planner ↗</a><button type="button" className="dz-btn pri" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save prices"}</button></div>
    </div>
  );
}
