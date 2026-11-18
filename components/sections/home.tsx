/* ============================================================
   HOME PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/home/wireframe.html
   Content comes from lib/seed/pages.json (configurator-ready shape, S1: no DB).
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, PhoneIcon } from "@/components/icons";
import { CONTACT } from "@/lib/content";
import homeContent from "@/lib/seed/home.json";
import { Highlight } from "@/components/chrome/Design";
import { Cover, coverFacts } from "@/components/sections/cover";

/* ── shared bits ─────────────────────────────────────────── */
const Eyebrow = ({ label }: { label: string }) => (
  <span className="eyebrow"><span className="orbit" />{label}</span>
);

const Placeholder = ({ note, className = "" }: { note: string; className?: string }) => (
  <div className={`imgph ${className}`}>{note}</div>
);

/* ═══ 1 · HERO ═══ */
export function Hero({ content }: { content?: typeof homeContent.hero }) {
  const c = content ?? homeContent.hero;
  return (
    <section className="hero pad">
      <div>
        <Eyebrow label={c.eyebrow} />
        <h1>{c.h1a}<br /><Highlight text={c.h1b} /></h1>
        <p className="lede">{c.lede}</p>
        <div className="hero-actions">
          <Link className="action dark" href="/contact">{c.ctaPrimary} <ArrowRight /></Link>
          <Link className="watch" href={(c as { ctaWatchHref?: string }).ctaWatchHref || "/projects"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
            </svg>
            {c.ctaWatch}
          </Link>
        </div>
      </div>
      <div className="hero-visual">
        <div className="slabph" aria-hidden />
        {c.photo ? (
          <div className="imgph realimg-box ph"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
        ) : (
          <Placeholder
            className="ph"
            note={c.imageNote}
          />
        )}
        <span className="scribble hero-note">{c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</span>
      </div>
    </section>
  );
}

/* ═══ 2 · PARTNER/AUDIENCE STRIP ═══ */
export function Partners({ content }: { content?: typeof homeContent.partners }) {
  const p = content ?? homeContent.partners;
  const items = p.items as { label: string; strong: boolean }[];
  return (
    <section className="partners">
      <Eyebrow label={p.eyebrow} />
      <div className="mo-track">
      <div className="partner-row mo-marquee">
        {items.map((it, i) => (
          <span key={i} style={{ display: "contents" }}>
            {it.strong ? <b>{it.label}</b> : <span>{it.label}</span>}
            {i < items.length - 1 && <i>•</i>}
          </span>
        ))}
        {/* a second copy so the moving strip (Animation: Full) loops without a jump; hidden otherwise */}
        <span className="mo-dup" aria-hidden="true">
          <i>•</i>
          {items.map((it, i) => (
            <span key={i} style={{ display: "contents" }}>
              {it.strong ? <b>{it.label}</b> : <span>{it.label}</span>}
              <i>•</i>
            </span>
          ))}
        </span>
      </div>
      </div>
    </section>
  );
}

/* ═══ 3 · ABOUT / PROCESS ═══ */
export function About({ content }: { content?: typeof homeContent.about }) {
  const c = content ?? homeContent.about;
  return (
    <section className="about pad" id="about">
      <div className="center-head">
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2}</h2>
        <p>{c.lede}</p>
      </div>
      <div className="about-grid">
        <div className="about-photo">
          {c.photo ? (
            <div className="imgph realimg-box"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
          ) : (
            <Placeholder note={c.imageNote} />
          )}
        </div>
        <div className="stats">
          {c.steps.map((s) => (
            <div className="stat" key={s.n}>
              <span dangerouslySetInnerHTML={{ __html: s.icon }} />
              <div><strong>{s.n}</strong><p>{s.text}</p></div>
            </div>
          ))}
          <div className="about-actions">
            <Link className="action dark" href="/about">{c.ctaMore} <ArrowRight /></Link>
            <Link className="inline-call" href={`tel:${CONTACT.phoneTel}`}>
              <PhoneIcon />
              <span><small>Call Free Quote</small>{CONTACT.phoneDisplay}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 4 · SERVICES SPLIT ═══ */
export function ServicesSplit({ content }: { content?: typeof homeContent.services }) {
  const c = content ?? homeContent.services;
  return (
    <section className="services pad" id="services">
      <div>
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2a}<br />{c.h2b}</h2>
        <p className="lede">{c.lede}</p>
        <div style={{ marginTop: 15 }}>
          <Link className="action dark" href="/services">{c.cta} <ArrowRight /></Link>
        </div>
        <span className="scribble svc-note">
          {c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
          <ArrowUpRight />
        </span>
      </div>
      <div className="svc-list">
        {c.items.map((s) => (
          <Link key={s.n} href={s.href}>
            <span>{s.n}</span>
            <div><h3>{s.title}</h3><p>{s.blurb}</p></div>
            <ArrowUpRight />
          </Link>
        ))}
      </div>
      <div className="svc-photo">
        {c.photo ? (
          <div className="imgph realimg-box ph"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
        ) : (
          <Placeholder className="ph" note={c.imageNote} />
        )}
        <div className="photo-card">{c.card.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}<sup>™</sup></div>
      </div>
    </section>
  );
}

/* ═══ 5 · SELECTED WORK ═══ */
export function Work({ content }: { content?: typeof homeContent.work }) {
  const c = content ?? homeContent.work;
  return (
    <section className="work pad" id="projects">
      <div>
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2a}<br />{c.h2b}</h2>
        <p className="lede">{c.lede}</p>
        <div style={{ marginTop: 14 }}>
          <Link className="text-link" href="/projects">{c.cta} <ArrowRight /></Link>
        </div>
      </div>
      <div className="proj-grid">
      {c.items.map((p, i) => (
        <Link className="proj" key={i} href={(p as { href?: string }).href || "/projects"} style={{ display: "block" }}>
          {(p as { cover?: string }).cover ? (
            <div className="ph cover-box"><img src={(p as { cover?: string }).cover} alt={String(p.note ?? p.name)} /></div>
          ) : (
            <div className="ph cover-box"><Cover {...coverFacts(p, i)} /></div>
          )}
            <h3>{p.name} <ArrowUpRight /></h3>
            <p>{p.tags}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ 6 · INDUSTRIES ═══ */
export function Industries({ content }: { content?: typeof homeContent.industries }) {
  const c = content ?? homeContent.industries;
  const names = c.items.filter((it) => !/^and more$/i.test(it.label));
  // each lane holds the list twice so the loop never jumps; the copy is hidden from screen readers
  const solid = (copy: boolean) => names.map((it) => <span key={`${copy}-${it.label}`} aria-hidden={copy || undefined}>{it.label}<em aria-hidden /></span>);
  const outline = (copy: boolean) => [...names].reverse().map((it) => (
    <span key={`${copy}-${it.label}`} aria-hidden="true"><span className="ic" dangerouslySetInnerHTML={{ __html: it.icon }} />{it.label}</span>
  ));
  return (
    <section className="indband" aria-label={c.eyebrow}>
      <div className="indband-top pad">
        <div><Eyebrow label={c.eyebrow} /><h2>{c.h2a} {c.h2b}</h2></div>
        <p className="lede">{c.lede}</p>
      </div>
      <div className="ind-mask"><div className="ind-lane">{solid(false)}{solid(true)}</div></div>
      <div className="ind-mask"><div className="ind-lane rev out">{outline(false)}{outline(true)}</div></div>
    </section>
  );
}

/* ═══ 6b · INDUSTRIES — Editorial list: ruled rows, one per field, with what we do for them ═══ */
const IND_BLURB: Record<string, string> = {
  "Technology": "Product sites, dashboards and the internal tools behind them.",
  "Health & Wellness": "Bookings, reminders and WhatsApp follow-ups that fill the calendar.",
  "Real Estate": "Listings, lead capture and replies that reach buyers first.",
  "Consumer Brands": "Online stores, catalogues and ads that start conversations.",
  "Education": "Course sites, enquiry funnels and admissions on autopilot.",
};
export function IndustriesList({ content }: { content?: typeof homeContent.industries }) {
  const c = content ?? homeContent.industries;
  const items = c.items as { label: string; icon: string; blurb?: string }[];
  const named = items.filter((it) => !/^and more$/i.test(it.label));
  return (
    <section className="indlist pad" aria-label={c.eyebrow}>
      <div className="indlist-head">
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2a}<br />{c.h2b}</h2>
        <p className="lede">{c.lede}</p>
      </div>
      <ol className="indlist-rows">
        {named.map((it, i) => (
          <li key={it.label}>
            <span className="no">{String(i + 1).padStart(2, "0")}</span>
            <span className="ic" aria-hidden dangerouslySetInnerHTML={{ __html: it.icon }} />
            <b>{it.label}</b>
            <p>{it.blurb || IND_BLURB[it.label] || ""}</p>
          </li>
        ))}
        <li className="more">
          <span className="no">{String(named.length + 1).padStart(2, "0")}</span>
          <span className="ic" aria-hidden>+</span>
          <b>Something else?</b>
          <Link href="/plan">If it runs on enquiries, we can help. Plan it <ArrowRight /></Link>
        </li>
      </ol>
    </section>
  );
}

/* ═══ 7 · TESTIMONIAL ═══ */
export function Testimonial({ content }: { content?: typeof homeContent.testimonial }) {
  const c = content ?? homeContent.testimonial;
  return (
    <section className="testi pad">
      <div>
        <Eyebrow label={c.eyebrow} />
        <blockquote>&ldquo;{c.quote}&rdquo;</blockquote>
        <div className="qmeta">
          <span className="ava" aria-hidden />
          <span>
            <b>{c.name}</b>
            <small>{c.role}</small>
            <em className="stars" aria-label={`${c.stars} out of 5 stars`}>{"★".repeat(c.stars)}</em>
          </span>
        </div>
        <div className="qctrl">
          <button aria-label="Previous testimonial">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <button aria-label="Next testimonial">
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="qimg">
        {c.photo ? (
          <div className="imgph realimg-box"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
        ) : (
          <Placeholder note={c.imageNote} />
        )}
        <span className="scribble">{c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</span>
      </div>
    </section>
  );
}

/* ═══ 8 · TEAM ═══ */
export function Team({ content }: { content?: typeof homeContent.team }) {
  const c = content ?? homeContent.team;
  return (
    <section className="team pad" id="team">
      <div>
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2a}<br />{c.h2b}</h2>
        <p className="lede">{c.lede}</p>
        <div style={{ marginTop: 14 }}>
          <Link className="text-link" href="/about">{c.cta} <ArrowRight /></Link>
        </div>
      </div>
      <div className="team-photo">
        {c.photo ? (
          <div className="imgph realimg-box"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
        ) : (
          <Placeholder note={c.imageNote} />
        )}
        <div className="team-names">
          {c.members.map((m) => (
            <span key={m.name}><b>{m.name}</b><small>{m.role}</small></span>
          ))}
        </div>
      </div>
      <span className="scribble team-note">{c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</span>
    </section>
  );
}

/* ═══ 9 · CONTACT BAND ═══ */
export function ContactBand({ content }: { content?: typeof homeContent.contactBand }) {
  const c = content ?? homeContent.contactBand;
  return (
    <section className="contact pad" id="contact">
      <h2>{c.h2a}<br />{c.h2b}</h2>
      <svg className="contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="7" y1="7" x2="17" y2="17" /><polyline points="17 7 17 17 7 17" />
      </svg>
      <p>{c.text}</p>
      <Link className="action dark" href="/contact">{c.cta} <ArrowRight /></Link>
      <Link className="inline-call" href={`tel:${CONTACT.phoneTel}`}>
        <PhoneIcon />
        <span><small>Call Any Time</small>{CONTACT.phoneDisplay}</span>
      </Link>
      <div className="cimg">
        {c.photo ? (
          <div className="imgph realimg-box"><img src={c.photo} alt={String(c.imageNote ?? "")} /></div>
        ) : (
          <Placeholder note={c.imageNote} />
        )}
        <span className="scribble">{c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</span>
      </div>
    </section>
  );
}

/* ═══ PLAN YOUR PROJECT — "the route": five numbered stops, ending in the plan (opens /plan) ═══ */
const PLAN_STOPS: { t: string; q: string; ans: { l: string; href?: string }[] }[] = [
  { t: "What", q: "What are we building?", ans: [
    { l: "Website", href: "/plan?type=website" }, { l: "Online store", href: "/plan?type=store" }, { l: "WhatsApp automation", href: "/plan?type=whatsapp" },
    { l: "Instagram", href: "/plan?type=instagram" }, { l: "Custom tool", href: "/plan?type=custom" }] },
  { t: "You", q: "Your business and team", ans: [{ l: "Just me" }, { l: "Small team" }, { l: "Growing" }] },
  { t: "Must-haves", q: "Tick what you need", ans: [{ l: "Bookings" }, { l: "Payments" }, { l: "AI replies" }, { l: "CRM" }] },
  { t: "When", q: "How soon?", ans: [{ l: "No rush" }, { l: "Next month" }, { l: "ASAP" }] },
  { t: "Budget", q: "What feels comfortable", ans: [{ l: "Under ₹25k" }, { l: "₹25–75k" }, { l: "₹75k+" }] },
];
export function PlanStart({ content }: { content?: typeof homeContent.planner }) {
  const c = content ?? homeContent.planner;
  return (
    <section className="prt">
      <div className="prt-top pad">
        <div><Eyebrow label={c.eyebrow} /><h2>{c.h2a}</h2></div>
        <p className="lede">{c.lede}</p>
      </div>
      <ol className="prt-lane">
        {PLAN_STOPS.map((s, i) => (
          <li key={s.t} className="prt-cell">
            <span className="no">0{i + 1}</span><b>{s.t}</b><span className="q">{s.q}</span>
            <span className="ans">{s.ans.map((x) => x.href ? <Link key={x.l} href={x.href}>{x.l}</Link> : <em key={x.l}>{x.l}</em>)}</span>
          </li>
        ))}
        <li className="prt-cell prt-end">
          <span className="no">{c.endLabel}</span>
          <div><b>{c.endTitle}</b><p className="q">{c.endNote}</p></div>
          <Link className="action dark" href="/plan">{c.cta} <ArrowRight /></Link>
        </li>
      </ol>
    </section>
  );
}
