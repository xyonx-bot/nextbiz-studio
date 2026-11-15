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

/* ═══ LIBRARY GRID — search + type chips ═══ */
export function Library({
  entries, types, searchPlaceholder, emptyNote,
}: {
  entries: (ResourceEntry & { href: string; snippet: string })[];
  types: TypeLabel[];
  searchPlaceholder: string;
  emptyNote: string;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const labelOf = (k: string) => types.find((t) => t.key === k)?.label ?? k;

  // only offer chips for kinds that actually have items
  const chips = types.filter((t) => entries.some((e) => e.type === t.key));
  const counts = Object.fromEntries(chips.map((t) => [t.key, entries.filter((e) => e.type === t.key).length]));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) =>
      (type === "all" || e.type === type) &&
      (!needle || [e.title, e.summary, e.tool, labelOf(e.type), ...(e.inside ?? [])]
        .join(" ").toLowerCase().includes(needle)),
    );
  }, [q, type, entries]);

  return (
    <section className="lib pad" id="library">
      <div className="lib-tools">
        <label className="lib-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search the library"
          />
        </label>
        <div className="lib-chips" role="tablist" aria-label="Filter by kind">
          <button role="tab" aria-selected={type === "all"} className={type === "all" ? "on" : ""} onClick={() => setType("all")}>
            All <span>{entries.length}</span>
          </button>
          {chips.map((t) => (
            <button key={t.key} role="tab" aria-selected={type === t.key} className={type === t.key ? "on" : ""} onClick={() => setType(t.key)}>
              {t.label} <span>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="lib-empty">{emptyNote}</p>
      ) : (
        <div className="lib-grid">
          {shown.map((e, i) => (
            <Link className="rcard" href={e.href} key={e.id || e.slug}>
              <div className="rcard-face">
                <div className="rcard-top">
                  <span className="rtag">{labelOf(e.type)}</span>
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
          ))}
        </div>
      )}
    </section>
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
        <a className="action dark rfile" href={file} target="_blank" rel="noreferrer">
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
