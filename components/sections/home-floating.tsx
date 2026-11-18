/* ============================================================
   HOME — FLOATING (Soft) LAYOUTS
   The same content as components/sections/home.tsx, laid out for the Soft style: centred compositions,
   floating cards and chips, bento grids, inset rounded panels. The Editorial (hairline) style keeps the
   original components. app/page.tsx picks the version from the active design.
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, PhoneIcon } from "@/components/icons";
import { CONTACT } from "@/lib/content";
import { Highlight } from "@/components/chrome/Design";
import homeContent from "@/lib/seed/home.json";
import { Cover, coverFacts } from "@/components/sections/cover";

const Pill = ({ label }: { label: string }) => <span className="fl-pill"><i aria-hidden />{label}</span>;
const Img = ({ src, note, className = "" }: { src?: string; note?: string; className?: string }) =>
  src ? <img className={`fl-img ${className}`} src={src} alt={note ?? ""} /> : <div className={`fl-img fl-ph ${className}`} aria-hidden>{note}</div>;

/* ═══ HERO — centred headline, then a wide photo card with floating glass chips ═══ */
export function HeroF({ content }: { content?: typeof homeContent.hero }) {
  const c = content ?? homeContent.hero;
  return (
    <section className="fl-hero pad">
      <div className="fl-hero-copy">
        <Pill label={c.eyebrow} />
        <h1>{c.h1a} <Highlight text={c.h1b} /></h1>
        <p>{c.lede}</p>
        <div className="fl-acts">
          <Link className="action dark" href="/contact">{c.ctaPrimary} <ArrowRight /></Link>
          <Link className="fl-ghost" href={(c as { ctaWatchHref?: string }).ctaWatchHref || "/projects"}>{c.ctaWatch} <ArrowUpRight /></Link>
        </div>
      </div>
      <div className="fl-hero-stage">
        <Img src={c.photo} note={c.imageNote} className="fl-hero-img" />
        <div className="fl-chip a"><span className="live" />Replying on WhatsApp now<small>usually in under an hour</small></div>
        <div className="fl-chip b"><b>3</b><span>ways we help<small>build · market · automate</small></span></div>
        <div className="fl-chip c"><span className="ic">✦</span><span>From idea to launch<small>Plan · Build · Improve</small></span></div>
      </div>
    </section>
  );
}

/* ═══ AUDIENCE — a gently moving row of pills ═══ */
export function PartnersF({ content }: { content?: typeof homeContent.partners }) {
  const p = content ?? homeContent.partners;
  const items = p.items as { label: string; strong: boolean }[];
  const row = (copy: boolean) => items.map((it, i) => <span key={`${copy}-${i}`} className={`fl-aud${it.strong ? " strong" : ""}`} aria-hidden={copy || undefined}>{it.label}</span>);
  return (
    <section className="fl-partners" aria-label={p.eyebrow}>
      <p className="fl-partners-h">{p.eyebrow}</p>
      <div className="fl-partners-track"><div className="fl-partners-row">{row(false)}{row(true)}</div></div>
    </section>
  );
}

/* ═══ ABOUT — bento: intro card, photo tile, four step tiles, lime action tile ═══ */
export function AboutF({ content }: { content?: typeof homeContent.about }) {
  const c = content ?? homeContent.about;
  return (
    <section className="fl-about pad" id="about">
      <div className="fl-bento">
        <div className="fl-tile intro">
          <Pill label={c.eyebrow} />
          <div className="txt"><h2>{c.h2}</h2><p>{c.lede}</p></div>
        </div>
        <div className="fl-tile photo"><Img src={c.photo} note={c.imageNote} /></div>
        {c.steps.map((s) => {
          const [word, ...rest] = String(s.text).split(" — ");
          return (
            <div className="fl-tile step" key={s.n}>
              <span className="ic" dangerouslySetInnerHTML={{ __html: s.icon }} />
              <span className="n">{s.n}</span>
              <b>{rest.length ? word.charAt(0) + word.slice(1).toLowerCase() : s.n}</b>
              <small>{rest.length ? rest.join(" — ") : s.text}</small>
            </div>
          );
        })}
        <Link className="fl-tile act" href="/about"><span>{c.ctaMore}</span><i aria-hidden><ArrowUpRight /></i></Link>
        <Link className="fl-tile call" href={`tel:${CONTACT.phoneTel}`}><PhoneIcon /><span><small>Call free quote</small>{CONTACT.phoneDisplay}</span></Link>
      </div>
    </section>
  );
}

/* ═══ SERVICES — centred head, four service cards, a floating photo note ═══ */
export function ServicesF({ content }: { content?: typeof homeContent.services }) {
  const c = content ?? homeContent.services;
  return (
    <section className="fl-services pad" id="services">
      <div className="fl-center">
        <Pill label={c.eyebrow} />
        <h2>{c.h2a} {c.h2b}</h2>
        <p>{c.lede}</p>
      </div>
      <div className="fl-svc-grid">
        {c.items.map((s) => (
          <Link key={s.n} href={s.href} className="fl-svc">
            <span className="n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.blurb}</p>
            <span className="go" aria-hidden><ArrowUpRight /></span>
          </Link>
        ))}
      </div>
      <div className="fl-center-acts">
        <Link className="action dark" href="/services">{c.cta} <ArrowRight /></Link>
        <span className="fl-note scribble">{c.sticky.join(" ")}</span>
      </div>
    </section>
  );
}

/* ═══ WORK — head row, then a sideways-scrolling row of large rounded project cards ═══ */
export function WorkF({ content, covers = "made" }: { content?: typeof homeContent.work; covers?: "made" | "photo" }) {
  const c = content ?? homeContent.work;
  return (
    <section className="fl-work" id="projects">
      <div className="fl-row-head pad">
        <div><Pill label={c.eyebrow} /><h2>{c.h2a} {c.h2b}</h2></div>
        <div className="r"><p>{c.lede}</p><Link className="fl-ghost" href="/projects">{c.cta} <ArrowRight /></Link></div>
      </div>
      <div className="fl-rail pad">
        {c.items.map((p, i) => (
          <Link className={`fl-proj${i === 0 ? " big" : ""}`} key={i} href={(p as { href?: string }).href || "/projects"}>
            {p.photo && covers === "photo" ? <Img src={p.photo} note={p.note} /> : <Cover {...coverFacts(p, i)} />}
            <span className="tag">{p.tags}</span>
            <span className="cap"><b>{p.name}</b><i aria-hidden><ArrowUpRight /></i></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ INDUSTRIES — a centred cloud of floating pills over a soft glow ═══ */
export function IndustriesF({ content }: { content?: typeof homeContent.industries }) {
  const c = content ?? homeContent.industries;
  return (
    <section className="fl-ind pad" aria-label={c.eyebrow}>
      <div className="fl-glow" aria-hidden />
      <div className="fl-center">
        <Pill label={c.eyebrow} />
        <h2>{c.h2a} {c.h2b}</h2>
        <p>{c.lede}</p>
      </div>
      <div className="fl-cloud">
        {c.items.map((it) => (
          <span key={it.label} className={`fl-ichip${/^and more$/i.test(it.label) ? " more" : ""}`}>
            <span className="ic" dangerouslySetInnerHTML={{ __html: it.icon }} />{it.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ═══ CONTACT — one centred rounded card with the photo floating at its side ═══ */
export function ContactBandF({ content }: { content?: typeof homeContent.contactBand }) {
  const c = content ?? homeContent.contactBand;
  return (
    <section className="fl-contact pad" id="contact">
      <div className="fl-contact-card">
        <div className="copy">
          <h2>{c.h2a} {c.h2b}</h2>
          <p>{c.text}</p>
          <div className="fl-acts">
            <Link className="action dark" href="/contact">{c.cta} <ArrowRight /></Link>
            <Link className="fl-ghost" href={`tel:${CONTACT.phoneTel}`}><PhoneIcon /> {CONTACT.phoneDisplay}</Link>
          </div>
        </div>
        <div className="pic"><Img src={c.photo} note={c.imageNote} /><span className="scribble">{c.scribble.join(" ")}</span></div>
      </div>
    </section>
  );
}
