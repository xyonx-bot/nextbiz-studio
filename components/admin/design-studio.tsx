"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { publishDesignAction, saveDesignDraftAction } from "@/app/admin/actions";
import { ACCENTS, DESIGN_DEFAULTS, contrast, normalizeDesign, onColor, textShade, type Design } from "@/lib/design-core";
import type { HistoryItem } from "@/lib/design";

/**
 * Design studio: settings on the left, the real site on the right (an iframe in draft-preview mode).
 * Every change is posted into the iframe and applies instantly; nothing reaches visitors until Publish.
 */
const PAGES: [string, string][] = [["/", "Home"], ["/services", "Services"], ["/projects", "Projects"], ["/resources", "Resources"], ["/nextbiz-one", "NextBiz One"], ["/contact", "Contact"]];
const SHOW: [keyof Design["show"], string, string][] = [
  ["buttons", "Main buttons", "“Get Started”, “Send enquiry” and other dark buttons"],
  ["badges", "Badges", "SOON in the menu, the live dot on projects"],
  ["highlight", "Headline highlight", "The chosen words in the homepage headline"],
  ["nav", "Current page", "Underline under the page you're on, and its arrow on phones"],
  ["details", "Small details", "Label dots, link underlines, the phone icon, form focus"],
  ["dark", "Dark sections", "NextBiz One waitlist: accent badge, coloured heading line, soft glow"],
];
const same = (a: Design, b: Design) => JSON.stringify(a) === JSON.stringify(b);
const fmt = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); };

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="dz-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
function Toggle({ on, onChange, label, sub, id }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string; id: string }) {
  return (
    <label className="dz-toggle" htmlFor={id}>
      <span><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}
function Swatches({ value, onChange, allowSame, testId }: { value: string | null; onChange: (hex: string | null) => void; allowSame?: boolean; testId?: string }) {
  const custom = value && !ACCENTS.some((a) => a.hex === value);
  return (
    <div className="dz-sw" data-testid={testId}>
      {allowSame && <button type="button" className={value === null ? "on same" : "same"} onClick={() => onChange(null)} title="Same as accent"><span>Same</span></button>}
      {ACCENTS.map((a) => (
        <button key={a.id} type="button" className={value === a.hex ? "on" : ""} onClick={() => onChange(a.hex)} title={`${a.name} — ${a.note}`} aria-label={a.name}>
          <i style={{ background: a.hex }} /><span>{a.name}</span>
        </button>
      ))}
      {!allowSame && (
        <label className={`custom${custom ? " on" : ""}`} title="Your own colour">
          <input type="color" value={value ?? "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label="Custom colour" />
          <span>{custom ? value : "Custom"}</span>
        </label>
      )}
    </div>
  );
}

export function DesignStudio({ draft, published, history: initialHistory }: { draft: Design; published: Design; history: HistoryItem[] }) {
  const [d, setD] = useState<Design>(draft);
  const [live, setLive] = useState<Design>(published);
  const [saved, setSaved] = useState<Design>(draft);
  const [history, setHistory] = useState(initialHistory);
  const [page, setPage] = useState("/");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 900, h: 600 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setFit({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // desktop: render the site at a real laptop width and scale it down to fit
  const W = device === "desktop" ? 1366 : 390;
  const scale = device === "desktop" ? Math.min(1, fit.w / W) : Math.min(1, (fit.h - 24) / 844);

  const set = (patch: Partial<Design>) => { setD((v) => normalizeDesign({ ...v, ...patch })); setConfirmPub(false); };
  const setIn = <K extends "show" | "highlight" | "bar" | "soon" | "soft" | "editorial" | "header">(k: K, patch: Partial<Design[K]>) => set({ [k]: { ...d[k], ...patch } } as Partial<Design>);

  // keep the preview in sync: on every change, and whenever the framed page (re)loads
  const post = () => frame.current?.contentWindow?.postMessage({ type: "nbs-design", design: d }, window.location.origin);
  useEffect(post, [d]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "nbs-design-ready") post(); };
    window.addEventListener("message", on); return () => window.removeEventListener("message", on);
  });

  // the two styles (and the planner section choice) render different section components,
  // so switching saves the draft and reloads the preview
  const layoutKey = `${d.style}:${d.editorial.planner}:${d.editorial.industries}`;
  const lastStyle = useRef(layoutKey);
  useEffect(() => {
    if (lastStyle.current === layoutKey) return;
    lastStyle.current = layoutKey;
    start(async () => {
      await saveDesignDraftAction(d);
      setSaved(d);
      frame.current?.contentWindow?.location.reload();
    });
  }, [layoutKey]);

  const ratios = useMemo(() => {
    const on = onColor(d.accent);
    return [
      { l: "Button text", v: contrast(d.accent, on), min: 4.5 },
      { l: "On dark sections", v: contrast(d.accent, "#14161A"), min: 3 },
      { l: "As text (shade used)", v: contrast(textShade(d.accent), "#F9F6F2"), min: 4.5 },
    ];
  }, [d.accent]);
  const isLive = same(d, live), isSaved = same(d, saved);
  const status = isLive ? "This is what visitors see" : isSaved ? "Draft saved — not live yet" : "Unsaved changes";

  const saveDraft = () => start(async () => { const r = await saveDesignDraftAction(d); setSaved(d); setMsg({ ok: r.ok, text: r.message }); });
  const publish = () => {
    if (!confirmPub) { setConfirmPub(true); return; }
    start(async () => {
      const r = await publishDesignAction(d);
      setLive(d); setSaved(d); setConfirmPub(false); if (r.history) setHistory(r.history); setMsg({ ok: r.ok, text: r.message });
    });
  };
  const accName = ACCENTS.find((a) => a.hex === d.accent)?.name ?? "Custom";

  return (
    <div className="dz" data-testid="design-studio">
      <div className="dz-form">
        <section className="dz-card dz-style">
          <h2>Style</h2>
          <p className="dz-sub">Each style has its own header, buttons, cards and photo shapes, designed to work together.</p>
          <div className="dz-styles" role="radiogroup" aria-label="Site style">
            {([["editorial", "Editorial", "Your live site's look: hairline header, leaf photos — with options below"], ["soft", "Soft (floating)", "Floating pill header, round buttons, rounded cards — still being refined"]] as const).map(([id, name, sub]) => (
              <button key={id} type="button" role="radio" aria-checked={d.style === id} className={`dz-st ${id}${d.style === id ? " on" : ""}`} onClick={() => set({ style: id })} data-testid={`style-${id}`}>
                <span className="mini" aria-hidden><i className="h" /><i className="b" /><i className="c" /><i className="c" /><i className="c" /></span>
                <b>{name}</b><small>{sub}</small>
              </button>
            ))}
          </div>
          {d.style === "soft" ? (
            <div className="dz-list">
              <Toggle id="soft-blur" on={d.soft.blur} label="Glass header" sub="The floating header lets the page blur through" onChange={(v) => setIn("soft", { blur: v })} />
              <Toggle id="soft-lift" on={d.soft.lift} label="Cards lift on hover" sub="Cards rise slightly when you point at them" onChange={(v) => setIn("soft", { lift: v })} />
              <div className="dz-toggle as-row"><span><b>Roundness</b><small>How round cards and dark sections are</small></span>
                <Seg label="Roundness" value={d.soft.round} onChange={(v) => setIn("soft", { round: v })} options={[["soft", "Soft"], ["round", "Extra round"]]} /></div>
            </div>
          ) : (
            <div className="dz-list">
              <p className="dz-sub" style={{ margin: "4px 0 2px" }}>Every option below starts at your live site&apos;s original look.</p>
              <div className="dz-toggle as-row"><span><b>Photo corners</b><small>Leaf is the live look</small></span>
                <Seg label="Photo corners" value={d.editorial.corners} onChange={(v) => setIn("editorial", { corners: v })} options={[["signature", "Leaf"], ["soft", "Soft"], ["sharp", "Sharp"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Buttons</b><small>Sharp is the live look</small></span>
                <Seg label="Button shape" value={d.editorial.button} onChange={(v) => setIn("editorial", { button: v })} options={[["sharp", "Sharp"], ["rounded", "Rounded"], ["pill", "Pill"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Section labels</b><small>Pill is the live look</small></span>
                <Seg label="Section labels" value={d.editorial.labels} onChange={(v) => setIn("editorial", { labels: v })} options={[["pill", "Pill"], ["square", "Square"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Resource &amp; planner cards</b><small>Separate is the live look</small></span>
                <Seg label="Cards" value={d.editorial.cards} onChange={(v) => setIn("editorial", { cards: v })} options={[["separate", "Separate"], ["joined", "Joined"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Footer</b><small>Light is the live look</small></span>
                <Seg label="Footer" value={d.editorial.footer} onChange={(v) => setIn("editorial", { footer: v })} options={[["light", "Light"], ["dark", "Dark"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Planner section</b><small>Sentence: one big line and a button. Route: five numbered steps</small></span>
                <Seg label="Planner section" value={d.editorial.planner} onChange={(v) => setIn("editorial", { planner: v })} options={[["sentence", "Sentence"], ["route", "Route"]]} /></div>
              <div className="dz-toggle as-row"><span><b>Industries section</b><small>List: ruled rows, one per field. Moving: giant scrolling words</small></span>
                <Seg label="Industries section" value={d.editorial.industries} onChange={(v) => setIn("editorial", { industries: v })} options={[["list", "List"], ["moving", "Moving"]]} /></div>
              <Toggle id="ed-cta" on={d.editorial.headerCta} label="Button in the header" sub="Off (live look): “Call Any Time” + number. On: call button + your header button" onChange={(v) => setIn("editorial", { headerCta: v })} />
              <Toggle id="ed-num" on={d.editorial.numbers} label="Numbered stat cards" sub="01, 02, 03 in the corner of the About step cards" onChange={(v) => setIn("editorial", { numbers: v })} />
              <Toggle id="ed-rule" on={d.editorial.inkRule} label="Ink rules" sub="Section dividers in black instead of grey" onChange={(v) => setIn("editorial", { inkRule: v })} />
            </div>
          )}
        </section>

        <section className="dz-card">
          <h2>Accent colour <em>{accName}</em></h2>
          <p className="dz-sub">One colour for the things that should catch the eye. Your site stays black and off-white.</p>
          <Swatches value={d.accent} onChange={(hex) => set({ accent: hex ?? DESIGN_DEFAULTS.accent })} testId="accent-swatches" />
          <div className="dz-ratios">
            {ratios.map((r) => <span key={r.l} className={r.v >= r.min ? "ok" : "no"} title={r.v >= r.min ? "Easy to read" : "Too faint for small text"}>{r.v >= r.min ? "✓" : "!"} {r.l} {r.v.toFixed(1)}:1</span>)}
          </div>
        </section>

        <section className="dz-card">
          <h2>Badge colour</h2>
          <p className="dz-sub">SOON and the live dots. Pick a second colour to make them stand apart from buttons.</p>
          <Swatches value={d.badge} onChange={(hex) => set({ badge: hex })} allowSame />
        </section>

        <section className="dz-card">
          <h2>Where the accent shows</h2>
          <div className="dz-list">
            {SHOW.map(([k, l, s]) => <Toggle key={k} id={`show-${k}`} on={d.show[k]} label={l} sub={s} onChange={(v) => setIn("show", { [k]: v } as Partial<Design["show"]>)} />)}
          </div>
        </section>

        <section className="dz-card">
          <h2>Glow</h2>
          <Toggle id="glow" on={d.glow} label="Glow" sub="A soft accent glow under main buttons and in dark sections" onChange={(v) => set({ glow: v })} />
        </section>

        <section className="dz-card">
          <h2>Background tone</h2>
          <p className="dz-sub">The page colour behind everything.</p>
          <Seg label="Background tone" value={d.tone} onChange={(v) => set({ tone: v })} options={[["warm", "Warm off-white"], ["white", "Clean white"], ["cool", "Cool grey"]]} />
        </section>

        <section className="dz-card">
          <h2>Header &amp; footer</h2>
          <div className="dz-two">
            <label className="dz-field" htmlFor="hd-cta"><span>Header button text</span><input id="hd-cta" value={d.header.cta} maxLength={28} onChange={(e) => setD((v) => ({ ...v, header: { ...v.header, cta: e.target.value } }))} onBlur={() => set({})} placeholder="Plan a project" /></label>
            <Toggle id="hd-phone" on={d.header.phone} label="Call button" sub="Round phone button in the header" onChange={(v) => setIn("header", { phone: v })} />
          </div>
          <div className="dz-two">
            <label className="dz-field" htmlFor="ft-1"><span>Footer line 1</span><input id="ft-1" value={d.footer.line1} maxLength={40} onChange={(e) => setD((v) => ({ ...v, footer: { ...v.footer, line1: e.target.value } }))} onBlur={() => set({})} placeholder="Got an idea?" /></label>
            <label className="dz-field" htmlFor="ft-2"><span>Footer line 2 <small>in accent</small></span><input id="ft-2" value={d.footer.line2} maxLength={40} onChange={(e) => setD((v) => ({ ...v, footer: { ...v.footer, line2: e.target.value } }))} onBlur={() => set({})} placeholder="Let's make it work." /></label>
          </div>
        </section>

        <section className="dz-card">
          <h2>Animation</h2>
          <p className="dz-sub">Full: sections rise in as you scroll, the headline marker draws itself, numbers count up, the audience strip moves. Subtle: shorter, smaller movements only. Visitors who turn off motion on their device never see any.</p>
          <Seg label="Animation" value={d.motion} onChange={(v) => set({ motion: v })} options={[["full", "Full"], ["subtle", "Subtle"], ["off", "Off"]]} />
        </section>

        <section className="dz-card">
          <h2>Headline highlight</h2>
          <p className="dz-sub">Marks a few words of the homepage headline. Turn it off under “Where the accent shows”.</p>
          <Seg label="Highlight style" value={d.highlight.style} onChange={(v) => setIn("highlight", { style: v })} options={[["marker", "Marker"], ["underline", "Underline"], ["color", "Coloured text"]]} />
          <label className="dz-field" htmlFor="hl-phrase"><span>Words to highlight</span>
            <input id="hl-phrase" value={d.highlight.phrase} maxLength={60} onChange={(e) => setIn("highlight", { phrase: e.target.value })} placeholder="Need It" />
            <small>Must appear in the second line of the headline, e.g. “Need It”.</small></label>
        </section>

        <section className="dz-card">
          <h2>Announcement bar</h2>
          <Toggle id="bar-on" on={d.bar.on} label="Show a bar above the header" sub="Visitors can close it; it comes back when you change the text." onChange={(v) => setIn("bar", { on: v })} />
          <div className={d.bar.on ? "" : "dz-dim"}>
            <label className="dz-field" htmlFor="bar-text"><span>Message</span><input id="bar-text" value={d.bar.text} maxLength={140} onChange={(e) => setIn("bar", { text: e.target.value })} /></label>
            <div className="dz-two">
              <label className="dz-field" htmlFor="bar-label"><span>Link text</span><input id="bar-label" value={d.bar.linkLabel} maxLength={40} onChange={(e) => setIn("bar", { linkLabel: e.target.value })} /></label>
              <label className="dz-field" htmlFor="bar-href"><span>Link</span><input id="bar-href" value={d.bar.href} maxLength={300} onChange={(e) => setD((v) => ({ ...v, bar: { ...v.bar, href: e.target.value } }))} onBlur={() => set({})} placeholder="/nextbiz-one" /></label>
            </div>
            <Seg label="Bar colour" value={d.bar.tone} onChange={(v) => setIn("bar", { tone: v })} options={[["dark", "Dark"], ["accent", "Accent"]]} />
          </div>
        </section>

        <section className="dz-card">
          <h2>SOON badge</h2>
          <div className="dz-two">
            <label className="dz-field" htmlFor="soon-text"><span>Badge text</span><input id="soon-text" value={d.soon.text} maxLength={14} onChange={(e) => setD((v) => ({ ...v, soon: { ...v.soon, text: e.target.value } }))} onBlur={() => set({})} /></label>
            <Toggle id="soon-pulse" on={d.soon.pulse} label="Pulsing dot" onChange={(v) => setIn("soon", { pulse: v })} />
          </div>
        </section>

        <section className="dz-card">
          <h2>Earlier versions</h2>
          {history.length === 0 ? <p className="dz-sub">Each time you publish, the previous design is kept here so you can bring it back.</p> : (
            <div className="dz-hist">
              {history.map((h, i) => (
                <div key={i} className="dz-h"><i style={{ background: h.design.accent }} /><span><b>{ACCENTS.find((a) => a.hex === h.design.accent)?.name ?? h.design.accent}</b><small>Live until {fmt(h.at)}</small></span>
                  <button type="button" onClick={() => { setD(h.design); setConfirmPub(false); setMsg({ ok: true, text: "Loaded into the editor — publish to make it live again." }); }}>Load</button></div>
              ))}
            </div>
          )}
          <button type="button" className="dz-reset" onClick={() => { setD(DESIGN_DEFAULTS); setConfirmPub(false); }}>Reset to the original design (Editorial, Volt Lime)</button>
        </section>
      </div>

      <div className="dz-preview">
        <div className="dz-bar">
          <select aria-label="Page to preview" value={page} onChange={(e) => setPage(e.target.value)}>{PAGES.map(([p, l]) => <option key={p} value={p}>{l}</option>)}</select>
          <Seg label="Device" value={device} onChange={setDevice} options={[["desktop", "Desktop"], ["mobile", "Phone"]]} />
          <a className="dz-open" href={`/admin/design/preview?to=${encodeURIComponent(page)}`} target="_blank" rel="noreferrer">Open draft in a new tab ↗</a>
        </div>
        <div className={`dz-frame ${device}`} ref={box}>
          <iframe ref={frame} src={`/admin/design/preview?to=${encodeURIComponent(page)}`} title="Site preview with your draft design" onLoad={post}
            style={device === "desktop" ? { width: W, height: fit.h / scale, transform: `scale(${scale})` } : { width: W, height: 844, transform: `scale(${scale})` }} />
        </div>
        <div className="dz-actions" data-testid="design-actions">
          <span className={`dz-status ${isLive ? "live" : isSaved ? "saved" : "dirty"}`}>{status}</span>
          {msg && <span className={`dz-msg ${msg.ok ? "" : "err"}`} role="status">{msg.text}</span>}
          <span className="sp" />
          <button type="button" className="dz-btn" onClick={() => { setD(live); setConfirmPub(false); }} disabled={isLive || pending}>Discard changes</button>
          <button type="button" className="dz-btn" onClick={saveDraft} disabled={isSaved || pending} data-testid="save-draft">Save draft</button>
          <button type="button" className={`dz-btn pri${confirmPub ? " confirm" : ""}`} onClick={publish} disabled={isLive || pending} data-testid="publish">
            {pending ? "Working…" : confirmPub ? "Click again to publish to the live site" : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}
