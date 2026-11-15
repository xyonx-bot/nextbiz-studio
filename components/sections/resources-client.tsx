"use client";

/* ============================================================
   RESOURCES — interactive bits (search/filter, copy, email gates)
   Server components pass only PUBLIC data in (lib/resources.ts
   publicView); gated text arrives from /api/subscribe after an email.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import type { ResourceBlock, ResourceEntry, ResourcePrompt } from "./types";
import { accessLabel } from "@/lib/resources";

type TypeLabel = { key: string; label: string };

const EMAIL_KEY = "nbs-email";
const readEmail = () => {
  try { return localStorage.getItem(EMAIL_KEY) ?? ""; } catch { return ""; }
};
const saveEmail = (v: string) => {
  try { localStorage.setItem(EMAIL_KEY, v); } catch { /* private mode */ }
};

async function subscribe(body: Record<string, string>) {
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong — please try again.");
  return data as { ok: true; unlocked?: { prompts: ResourcePrompt[]; blocks: ResourceBlock[]; fileUrl: string } };
}

/* ═══ LIBRARY — two columns: filter rail (search + facets) | results ═══
   Facets: OR inside a group, AND across groups; counts reflect the
   other active groups. Filters live in the URL (?type=n8n&tool=…&q=…)
   so DMs and reels can link straight to a filtered view. */
export type LibraryCard = ResourceEntry & {
  href: string; snippet: string; tools: string[]; via: string; minutes: number;
};
type FacetKey = "type" | "tool" | "level" | "access";
const FACETS: FacetKey[] = ["type", "tool", "level", "access"];
const ACCESS_LABELS: Record<string, string> = { open: "Open — no sign-up", email: "Email unlock", dm: "Instagram DM" };
const valuesOf = (e: LibraryCard, f: FacetKey): string[] =>
  f === "type" ? [e.type] : f === "tool" ? e.tools : f === "level" ? (e.level ? [e.level] : []) : [e.via];

export function Library({
  entries, types, searchPlaceholder, emptyNote, labels,
}: {
  entries: LibraryCard[];
  types: TypeLabel[];
  searchPlaceholder: string;
  emptyNote: string;
  labels: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<FacetKey, string[]>>({ type: [], tool: [], level: [], access: [] });
  const [sort, setSort] = useState<"featured" | "az" | "quick">("featured");
  const [open, setOpen] = useState(false); // mobile filter sheet
  const labelOf = (k: string) => types.find((t) => t.key === k)?.label ?? k;
  const L = (k: string, d: string) => labels[k] ?? d;

  // URL → state once on mount (client only, avoids hydration mismatch)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const next = { type: [], tool: [], level: [], access: [] } as Record<FacetKey, string[]>;
    for (const f of FACETS) next[f] = sp.getAll(f).filter(Boolean);
    setSel(next);
    setQ(sp.get("q") ?? "");
  }, []);
  // state → URL (replace, no history spam)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    for (const f of FACETS) for (const v of sel[f]) sp.append(f, v);
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, [q, sel]);

  const needle = q.trim().toLowerCase();
  const matchQ = (e: LibraryCard) => !needle ||
    [e.title, e.summary, e.tool, labelOf(e.type), ...(e.inside ?? [])].join(" ").toLowerCase().includes(needle);
  const matchFacets = (e: LibraryCard, skip?: FacetKey) =>
    FACETS.every((f) => f === skip || sel[f].length === 0 || valuesOf(e, f).some((v) => sel[f].includes(v)));

  const shown = useMemo(() => {
    const list = entries.filter((e) => matchQ(e) && matchFacets(e));
    if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "quick") return [...list].sort((a, b) => a.minutes - b.minutes);
    return list; // server already put featured first
  }, [entries, q, sel, sort]);

  // facet options + live counts (respecting the other groups)
  const options = (f: FacetKey) => {
    const all = new Map<string, number>();
    for (const e of entries) for (const v of valuesOf(e, f)) all.set(v, all.get(v) ?? 0);
    for (const e of entries) if (matchQ(e) && matchFacets(e, f)) for (const v of valuesOf(e, f)) all.set(v, (all.get(v) ?? 0) + 1);
    let keys = [...all.keys()];
    if (f === "type") keys = types.map((t) => t.key).filter((k) => all.has(k));
    else if (f === "level") keys = ["Beginner", "Intermediate", "Advanced"].filter((k) => all.has(k));
    else if (f === "access") keys = ["open", "email", "dm"].filter((k) => all.has(k));
    else keys.sort((a, b) => (all.get(b)! - all.get(a)!) || a.localeCompare(b));
    return keys.map((k) => ({ key: k, count: all.get(k) ?? 0,
      label: f === "type" ? labelOf(k) : f === "access" ? ACCESS_LABELS[k] ?? k : k }));
  };
  const toggle = (f: FacetKey, v: string) =>
    setSel((s) => ({ ...s, [f]: s[f].includes(v) ? s[f].filter((x) => x !== v) : [...s[f], v] }));
  const active = FACETS.flatMap((f) => sel[f].map((v) => ({ f, v })));
  const clear = () => { setSel({ type: [], tool: [], level: [], access: [] }); setQ(""); };
  const groupTitle: Record<FacetKey, string> = {
    type: L("kind", "Kind"), tool: L("tool", "Works with"), level: L("level", "Level"), access: L("access", "How you get it"),
  };

  return (
    <section className="lib pad" id="library">
      <div className={`lib-scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden />
      <aside className={`lib-rail${open ? " open" : ""}`} aria-label="Filter the library">
        <div className="rail-head">
          <b>{L("filtersButton", "Filters")}</b>
          <button type="button" className="rail-close" onClick={() => setOpen(false)} aria-label="Close filters">×</button>
        </div>
        <label className="lib-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={searchPlaceholder} aria-label="Search the library" />
        </label>
        {FACETS.map((f) => {
          const opts = options(f);
          if (opts.length < 2 && sel[f].length === 0) return null;
          const long = f === "tool" && opts.length > 8;
          return (
            <fieldset className="facet" key={f}>
              <legend>{groupTitle[f]}</legend>
              <div className={long ? "facet-list scroll" : "facet-list"}>
                {opts.map((o) => (
                  <label key={o.key} className={`fopt${o.count === 0 && !sel[f].includes(o.key) ? " dim" : ""}`}>
                    <input type="checkbox" checked={sel[f].includes(o.key)} onChange={() => toggle(f, o.key)} />
                    <span className="box" aria-hidden />
                    <span className="fl">{o.label}</span>
                    <span className="fc">{o.count}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        {(active.length > 0 || q) && (
          <button type="button" className="rail-clear" onClick={clear}>{L("clear", "Clear all")}</button>
        )}
        <button type="button" className="action dark rail-done" onClick={() => setOpen(false)}>
          Show {shown.length} {L("results", "resources")}
        </button>
      </aside>

      <div className="lib-main">
        <div className="lib-bar">
          <button type="button" className="lib-filterbtn" onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {L("filtersButton", "Filters")}{active.length ? ` · ${active.length}` : ""}
          </button>
          <span className="lib-count"><b>{shown.length}</b> {L("results", "resources")}</span>
          <div className="lib-pills">
            {active.map(({ f, v }) => (
              <button type="button" key={`${f}:${v}`} onClick={() => toggle(f, v)} aria-label={`Remove filter ${v}`}>
                {f === "type" ? labelOf(v) : f === "access" ? ACCESS_LABELS[v] ?? v : v} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
          <label className="lib-sort">
            <span>Sort</span>
            <select value={sort} onChange={(ev) => setSort(ev.target.value as typeof sort)}>
              <option value="featured">{L("sortFeatured", "Featured first")}</option>
              <option value="az">{L("sortAZ", "A–Z")}</option>
              <option value="quick">{L("sortQuick", "Quickest first")}</option>
            </select>
          </label>
        </div>

        {shown.length === 0 ? (
          <div className="lib-empty">
            <p>{emptyNote}</p>
            <button type="button" className="text-link" onClick={clear}>{L("clear", "Clear all")} <ArrowRight /></button>
          </div>
        ) : (
          <div className="lib-grid">
            {shown.map((e, i) => <ResourceCard e={e} i={i} typeLabel={labelOf(e.type)} key={e.id || e.slug} />)}
          </div>
        )}
      </div>
    </section>
  );
}

export function ResourceCard({ e, i, typeLabel }: { e: LibraryCard; i: number; typeLabel: string }) {
  return (
    <Link className={`rcard t-${e.type}`} href={e.href}>
      <div className="rcard-face">
        <div className="rcard-top">
          <span className="rtag">{typeLabel}</span>
          <span className="no">{String(i + 1).padStart(2, "0")}</span>
        </div>
        <p className="rcard-snip">{e.snippet}</p>
      </div>
      <div className="rcard-body">
        <h3>{e.title} <ArrowUpRight /></h3>
        <p>{e.summary}</p>
        <div className="rcard-meta">
          <span>{[e.tool, e.time].filter(Boolean).join(" · ")}</span>
          <span className="rfree">{accessLabel(e)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ═══ COPYABLE PROMPT ═══ */
function PromptCard({ p, i }: { p: ResourcePrompt; i: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — text stays selectable */ }
  };
  return (
    <article className="prompt" id={`prompt-${i + 1}`}>
      <header>
        <h3>{p.title}</h3>
        <button type="button" onClick={copy} className={copied ? "done" : ""}>
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </header>
      <pre>{p.text}</pre>
    </article>
  );
}

function Block({ b }: { b: ResourceBlock }) {
  return (
    <div className="rblock">
      <h3>{b.h}</h3>
      <p>{b.p}</p>
    </div>
  );
}

/* ═══ CONTENT + EMAIL GATE (detail page) ═══ */
export function GatedContent({
  slug, prompts, blocks, lockedPrompts, lockedBlocks, hasFile, gated, cta, fileUrl, fileCta,
}: {
  slug: string;
  prompts: ResourcePrompt[];
  blocks: ResourceBlock[];
  lockedPrompts: number;
  lockedBlocks: number;
  hasFile: boolean;
  gated: boolean;        // email-mode item
  cta: string;
  fileUrl: string;       // open-mode file (public)
  fileCta: string;
}) {
  const [extra, setExtra] = useState<{ prompts: ResourcePrompt[]; blocks: ResourceBlock[]; fileUrl: string } | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const unlock = async (addr: string, quiet = false) => {
    setBusy(true); setErr("");
    try {
      const r = await subscribe({ email: addr, list: "resource", source: slug });
      if (r.unlocked) setExtra(r.unlocked);
      saveEmail(addr);
    } catch (e) {
      if (!quiet) setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // returning visitor who already gave an email: unlock without asking again
  useEffect(() => {
    if (!gated) return;
    const saved = readEmail();
    if (saved) { setEmail(saved); void unlock(saved, true); }
  }, [gated, slug]);

  const allPrompts = [...prompts, ...(extra?.prompts ?? [])];
  const allBlocks = [...blocks, ...(extra?.blocks ?? [])];
  const file = extra?.fileUrl || fileUrl;
  const locked = gated && !extra && (lockedPrompts > 0 || lockedBlocks > 0 || hasFile);

  return (
    <>
      {allBlocks.length > 0 && <div className="rblocks">{allBlocks.map((b, i) => <Block b={b} key={i} />)}</div>}
      {allPrompts.length > 0 && <div className="prompts">{allPrompts.map((p, i) => <PromptCard p={p} i={i} key={i} />)}</div>}

      {locked && (
        <div className="gate" id="unlock">
          {lockedPrompts > 0 && (
            <div className="gate-ghost" aria-hidden>
              {Array.from({ length: Math.min(lockedPrompts, 3) }).map((_, i) => <i key={i} />)}
            </div>
          )}
          <div className="gate-box">
            <span className="micro">
              {lockedPrompts > 0 ? `${lockedPrompts} more prompt${lockedPrompts > 1 ? "s" : ""}` : lockedBlocks > 0 ? "Keep reading" : "Get the file"}
              {" · free"}
            </span>
            <h3>{cta}</h3>
            <p>Enter your email and it opens right here. We&apos;ll also send new resources when they drop — unsubscribe any time.</p>
            <form
              className="gate-form"
              onSubmit={(ev) => { ev.preventDefault(); void unlock(email); }}
            >
              <input type="email" required value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="you@example.com" aria-label="Email address" />
              <button className="action dark" type="submit" disabled={busy}>
                {busy ? "Unlocking…" : "Unlock"} <ArrowRight />
              </button>
            </form>
            {err && <p className="gate-err" role="alert">{err}</p>}
          </div>
        </div>
      )}

      {file && (
        <a className="action dark rfile" href={file} target="_blank" rel="noreferrer" download={/\.json$/i.test(file) ? "" : undefined}>
          {fileCta} <ArrowUpRight />
        </a>
      )}
    </>
  );
}

/* ═══ SMALL EMAIL FORM — NextBiz One waitlist / footer newsletter ═══ */
export function EmailCapture({
  list, placeholder, cta, done, className = "", compact = false,
}: {
  list: "nextbiz-one" | "newsletter";
  placeholder: string;
  cta: string;
  done: string;
  className?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setState("busy"); setErr("");
    try {
      await subscribe({ email, list });
      saveEmail(email);
      setState("done");
    } catch (e) {
      setErr((e as Error).message);
      setState("idle");
    }
  };

  if (state === "done") return <p className={`capture-done ${className}`} role="status">{done}</p>;
  return (
    <>
      <form className={`${compact ? "row" : "capture"} ${className}`} onSubmit={submit}>
        <input type="email" required value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder={placeholder} aria-label="Email address" />
        <button type="submit" className={compact ? undefined : "action dark"} aria-label={cta} disabled={state === "busy"}>
          {compact ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          ) : (<>{state === "busy" ? "Joining…" : cta} <ArrowRight /></>)}
        </button>
      </form>
      {err && <p className="capture-err" role="alert">{err}</p>}
    </>
  );
}
