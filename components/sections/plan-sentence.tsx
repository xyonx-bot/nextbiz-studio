"use client";
/* ═══ PLAN YOUR PROJECT — "finish the sentence" (Editorial default)
   One sentence about the visitor; the underlined words are real planner answers. "Plan it" opens /plan
   with them filled in, so the visitor lands on Must-haves with only two questions left. ═══ */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons";
import homeContent from "@/lib/seed/home.json";

type Opt = { id: string; say: string };
const WHO: Opt[] = [{ id: "solo", say: "a one-person business" }, { id: "small", say: "a small team" }, { id: "growing", say: "a growing company" }];
const WANT: Opt[] = [
  { id: "whatsapp", say: "automate my WhatsApp" }, { id: "website", say: "get a website that brings enquiries" },
  { id: "store", say: "sell online" }, { id: "custom", say: "build a tool for my team" }, { id: "instagram", say: "grow on Instagram" },
];
const WHEN: Opt[] = [{ id: "normal", say: "in a month or two" }, { id: "asap", say: "as soon as possible" }, { id: "relaxed", say: "with no rush" }];
// industries come from the same list the planner uses ("and More" → "Something else")
const IND: Opt[] = (homeContent.industries.items as { label: string }[]).map((i) =>
  /^and more$/i.test(i.label) ? { id: "Something else", say: "another field" } : { id: i.label, say: i.label.toLowerCase() });
const START = { who: 1, ind: Math.max(0, IND.findIndex((i) => i.id === "Real Estate")), want: 0, when: 0 };
type Key = keyof typeof START;
const LISTS: Record<Key, Opt[]> = { who: WHO, ind: IND, want: WANT, when: WHEN };
const NAMES: Record<Key, string> = { who: "Who you are", ind: "Your field", want: "What you want", when: "When" };

export function PlanSentence({ content }: { content?: typeof homeContent.planner }) {
  const c = content ?? homeContent.planner;
  const [pick, setPick] = useState(START);
  const [open, setOpen] = useState<Key | null>(null);
  const root = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!(e.target as Element).closest?.(".ps-slot")) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { root.current?.querySelector<HTMLButtonElement>(`[data-k="${open}"] > button`)?.focus(); setOpen(null); } };
    document.addEventListener("click", off); document.addEventListener("keydown", esc);
    root.current?.querySelector<HTMLButtonElement>(`[data-k="${open}"] [aria-selected="true"]`)?.focus();
    return () => { document.removeEventListener("click", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (k: Key, i: number) => { setPick((p) => ({ ...p, [k]: i })); setOpen(null); root.current?.querySelector<HTMLButtonElement>(`[data-k="${k}"] > button`)?.focus(); };
  const slot = (k: Key) => (
    <span className={`ps-slot${open === k ? " open" : ""}`} data-k={k}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open === k} aria-label={`${NAMES[k]}: ${LISTS[k][pick[k]].say}. Change`} onClick={() => setOpen(open === k ? null : k)}>{LISTS[k][pick[k]].say}</button>
      <span className="ps-menu" role="listbox" aria-label={NAMES[k]}>
        <small>{NAMES[k]}</small>
        {LISTS[k].map((o, i) => (
          <button key={o.id} type="button" role="option" aria-selected={i === pick[k]} onClick={() => choose(k, i)}
            onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const b = e.currentTarget.parentElement!.querySelectorAll("button"); b[(i + (e.key === "ArrowDown" ? 1 : b.length - 1)) % b.length].focus(); } }}>
            {o.say}
          </button>
        ))}
      </span>
    </span>
  );

  const href = `/plan?type=${WANT[pick.want].id}&size=${WHO[pick.who].id}&industry=${encodeURIComponent(IND[pick.ind].id)}&when=${WHEN[pick.when].id}`;
  return (
    <section className="psent pad" aria-label={c.eyebrow}>
      <div className="psent-l">
        <span className="eyebrow"><span className="orbit" />{c.eyebrow}</span>
        <p className="psent-say" ref={root}>
          I&apos;m {slot("who")} in {slot("ind")}, and I want to {slot("want")}, {slot("when")}.
        </p>
        <span className="psent-hint">Tap an underlined word to change it</span>
      </div>
      <div className="psent-go">
        <span className="scribble">takes about a minute ↓</span>
        <Link className="psent-btn" href={href}>Plan it <i aria-hidden><ArrowRight /></i></Link>
        <dl className="psent-meta">
          <div><dt>You get</dt><dd>3 options</dd></div>
          <div><dt>Timeline</dt><dd>for each</dd></div>
          <div><dt>Left to answer</dt><dd>2 questions</dd></div>
          <div><dt>Sign-up</dt><dd>none</dd></div>
        </dl>
      </div>
    </section>
  );
}
