/* ============================================================
   HOME PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/home/wireframe.html
   Content comes from lib/seed/pages.json (configurator-ready shape, S1: no DB).
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, PhoneIcon } from "@/components/icons";
import { CONTACT } from "@/lib/content";
import homeContent from "@/lib/seed/home.json";

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
        <h1>{c.h1a}<br />{c.h1b}</h1>
        <p className="lede">{c.lede}</p>
        <div className="hero-actions">
          <Link className="action dark" href="/contact">{c.ctaPrimary} <ArrowRight /></Link>
          <Link className="watch" href="/projects">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
            </svg>
            {c.ctaWatch}
          </Link>
        </div>
      </div>
      <div className="hero-visual">
        <div className="slabph" aria-hidden />
        <Placeholder
          className="ph"
          note={c.imageNote}
        />
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
      <div className="partner-row">
        {items.map((it, i) => (
          <span key={i} style={{ display: "contents" }}>
            {it.strong ? <b>{it.label}</b> : <span>{it.label}</span>}
            {i < items.length - 1 && <i>•</i>}
          </span>
        ))}
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
        <Placeholder className="ph" note={c.imageNote} />
        <div className="photo-card">{c.card.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}<sup>™</sup></div>
        <div className="sticky scribble">{c.sticky.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</div>
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
        {c.items.map((p) => (
          <Link className="proj" key={p.name} href="/projects" style={{ display: "block" }}>
            <Placeholder className="ph" note={p.note} />
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
  return (
    <section className="industries">
      <div className="ind-img">
        <div>
          {c.panelLines.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
          <span style={{ display: "block", width: 75, height: 5, background: "var(--primary-fg)", marginTop: 25, borderRadius: 4 }} />
        </div>
      </div>
      <div className="ind-copy pad">
        <Eyebrow label={c.eyebrow} />
        <h2>{c.h2a}<br />{c.h2b}</h2>
        <p className="lede">{c.lede}</p>
        <div className="ind-icons">
          {c.items.map((it) => (
            <span key={it.label}>
              <span dangerouslySetInnerHTML={{ __html: it.icon }} />
              {it.label}
            </span>
          ))}
        </div>
      </div>
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
        <Placeholder note={c.imageNote} />
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
        <Placeholder note={c.imageNote} />
        <span className="scribble">{c.scribble.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}</span>
      </div>
    </section>
  );
}
