/* ============================================================
   INNER PAGES — FLOATING (Soft) LAYOUTS
   Same content as the Editorial sections (about.tsx, services.tsx, contact.tsx, projects.tsx),
   laid out for the Soft style: centred heads, rounded cards, bento grids, dark rounded panels,
   floating chips. The page files pick these when the Soft style is active. Styles: styles/pages-floating.css
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import about from "@/lib/seed/about.json";
import services from "@/lib/seed/services.json";
import contact from "@/lib/seed/contact.json";
import { WHATSAPP_URL } from "@/lib/content";
import { DeskForm } from "@/components/sections/contact-form";
import projectsSeed from "@/lib/seed/projects.json";
import { Cover } from "@/components/sections/cover";
import type { ProjectEntry } from "@/components/sections/types";

const Pill = ({ label }: { label: string }) => <span className="fl-pill"><i aria-hidden />{label}</span>;
const Photo = ({ src, note, className = "" }: { src?: string; note?: string; className?: string }) =>
  src ? <img className={`fp-img ${className}`} src={src} alt={note ?? ""} /> : <div className={`fp-img fl-ph ${className}`} aria-hidden>{note}</div>;
const first = (s: string) => s.split(/[·—]/)[0].trim();

/* ═══════════════════════════ ABOUT ═══════════════════════════ */

/** Centred headline with the ghost word as a lime pill, then a wide photo with the ledger as floating chips */
export function AboutHeroF({ content }: { content?: typeof about.masthead }) {
  const c = content ?? about.masthead;
  return (
    <section className="fp-hero pad">
      <div className="fp-hero-copy">
        <Pill label={first(c.micro)} />
        <h1>{c.h1[0]} around <span className="fp-word">{c.ghostWord}</span> {c.h1[2]}</h1>
        <p>{c.standfirst}</p>
      </div>
      <div className="fp-stage">
        <Photo src={c.photo} note={c.photoNote} />
        <dl className="fp-chips">
          {c.ledger.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

/** Story: a big statement card beside two paragraph cards */
export function StoryF({ content }: { content?: typeof about.story }) {
  const c = content ?? about.story;
  return (
    <section className="fp-sec pad">
      <div className="fp-story">
        <div className="fp-card dark"><Pill label="Our point of view" /><h2>{c.h2[0]} <em>{c.h2[1]}</em></h2></div>
        <div className="fp-card"><p className="lead">{c.col1}</p></div>
        <div className="fp-card soft"><p dangerouslySetInnerHTML={{ __html: c.col2.replace("Meta Proxy", "<strong>Meta Proxy</strong>") }} /></div>
      </div>
    </section>
  );
}

/** Definitions: four word cards in a 2×2 bento */
export function DefsF({ content }: { content?: typeof about.defs }) {
  const c = content ?? about.defs;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label="In our words" /><h2>{c.h2}</h2><p>{c.lede}</p></div>
      <div className="fp-grid g2">
        {c.items.map((d, i) => (
          <article className={`fp-card word${i === 0 ? " acc" : ""}`} key={d.term}>
            <span className="fp-n">{d.word}</span>
            <h3>{d.term}</h3>
            <p>{d.body}</p>
            <div className="fp-tags">{d.tags.map((t) => <span key={t}>{t}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Method: a dark rounded panel with the steps as a row of numbered cards */
export function MethodF({ content }: { content?: typeof about.method }) {
  const c = content ?? about.method;
  return (
    <section className="fp-sec pad">
      <div className="fp-panel">
        <div className="fp-panel-head"><div><Pill label={c.railLabel} /><h2>{c.h2}</h2></div><p>{c.lede}</p></div>
        <ol className="fp-steps">
          {c.rows.map((r) => (
            <li key={r.no}><span className="fp-num">{r.no}</span><h3>{r.title}</h3><p>{r.body}</p><span className="fp-prac">{r.practice}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** People: photo + facts bento, then role cards */
export function PeopleF({ content }: { content?: typeof about.people }) {
  const c = content ?? about.people;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label="The people" /><h2>{c.h2}</h2><p>{c.lede}</p></div>
      <div className="fp-people">
        <div className="fp-card photo"><Photo src={c.photo} note={c.photoNote} /></div>
        {c.facts.map((f, i) => (
          <div className={`fp-card fact${i === 0 ? " acc" : ""}`} key={i}><b>{f.b}{f.sup && <sup>{f.sup}</sup>}</b><span>{f.span}</span></div>
        ))}
      </div>
      <div className="fp-grid g4">
        {c.roster.map((m) => (
          <article className="fp-card role" key={m.idx}>
            <span className="fp-av" aria-hidden>{m.idx}</span>
            <h3>{m.name}</h3>
            <p>{m.desc}</p>
            <div className="fp-tags">{m.focus.split(" · ").map((t) => <span key={t}>{t}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Close: a lime rounded card with the ask and one button */
export function CloseF({ micro, ask, aside, cta, href }: { micro: string; ask: React.ReactNode; aside?: string; cta: string; href: string }) {
  return (
    <section className="fp-sec pad">
      <div className="fp-close">
        <div><Pill label={first(micro)} /><p className="ask">{ask}</p></div>
        <div className="r">{aside ? <p>{aside}</p> : null}<Link className="fp-btn" href={href}>{cta} <i aria-hidden><ArrowRight /></i></Link></div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ SERVICES ═══════════════════════════ */

/** Catalogue: centred head, meta chips, then one big rounded card per capability */
export function CatalogF({ content }: { content?: typeof services.catalog }) {
  const c = content ?? services.catalog;
  return (
    <section className="fp-hero pad">
      <div className="fp-hero-copy">
        <Pill label={first(c.micro)} />
        <h1>{c.h1[0]} <span className="fp-word">{c.h1[1]}</span></h1>
        <p>{c.intro}</p>
        <dl className="fp-meta">{c.meta.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl>
      </div>
      <div className={`fp-grid ${c.index.length % 4 === 0 ? "g4" : "g3"} fp-index`}>
        {c.index.map((r, i) => (
          <Link className="fp-card link" href={r.href} key={r.no}>
            <span className="fp-num">{r.no}</span>
            <h3>{r.name}</h3>
            <p>{r.cat}</p>
            <span className="fp-go">{r.go} <i aria-hidden><ArrowUpRight /></i></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Each capability: a rounded panel — copy on the left, an "includes" checklist card and a "good fit" card on the right */
export function DossiersF({ content }: { content?: typeof services.dossiers }) {
  const list = content ?? services.dossiers;
  return (
    <>
      {list.map((d, i) => (
        <section className="fp-sec pad" id={d.id} key={d.id}>
          <div className={`fp-dossier${i % 2 ? " flip" : ""}`}>
            <div className="copy">
              <span className="fp-num big">{d.no}</span>
              <Pill label={first(d.micro)} />
              <h2>{d.h2}</h2>
              {d.copy.map((p, j) => <p key={j}>{p}</p>)}
              <div className="fl-acts"><Link className="fp-btn" href="/contact">Discuss this capability <i aria-hidden><ArrowRight /></i></Link></div>
            </div>
            <div className="side">
              <div className="fp-card"><b className="fp-k">What&apos;s included</b><ul className="fp-checks">{d.includes.map((it) => <li key={it}>{it}</li>)}</ul></div>
              <div className="fp-card soft"><b className="fp-k">Good fit if</b><p>{d.fit}</p><small>{d.foot}</small></div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/** Product spec: dark card with the spec rows as soft pills, photo card beside */
export function SpecF({ content }: { content?: typeof services.spec }) {
  const c = content ?? services.spec;
  return (
    <section className="fp-sec pad" id="meta-proxy">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2}</h2><p>{c.lede}</p></div>
      <div className="fp-spec">
        <div className="fp-card photo"><Photo src={c.photo} note={c.photoNote} /><span className="fp-live"><i />{c.statusLine}</span></div>
        <div className="fp-card dark sheet">
          <div className="top"><b>{c.sheetTitle}</b><span>{c.sheetRev}</span></div>
          <dl>{c.sheetRows.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}{r.live && <em><i />{r.live}</em>}</dd></div>)}</dl>
          <p>{c.sheetFoot}</p>
          <Link className="fp-btn lime" href="/contact">{c.sheetCta} <i aria-hidden><ArrowRight /></i></Link>
        </div>
      </div>
      <div className="fp-grid g2 fp-copy2">{c.copy.map((p, i) => <div className="fp-card soft" key={i}><p>{p}</p></div>)}</div>
    </section>
  );
}

/** Compare: three option cards, the middle one raised */
export function CompareF({ content }: { content?: typeof services.compare }) {
  const c = content ?? services.compare;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2[0]} {c.h2[1]}</h2></div>
      <div className={`fp-grid ${c.cols.length === 2 ? "g2" : "g3"} fp-compare`}>
        {c.cols.map((col, i) => (
          <article className={`fp-card${i === c.cols.length - 1 ? " raised" : ""}`} key={col.letter}>
            <span className="fp-av">{col.letter}</span>
            <h3>{col.h3}</h3>
            <p>{col.copy}</p>
            <div className="fp-tags">{col.use.map((u) => <span key={u}>{u}</span>)}</div>
            <span className="fp-pick">{col.pick}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Engagement arc: a vertical timeline of rounded cards on a soft rail */
export function ArcF({ content }: { content?: typeof services.arc }) {
  const c = content ?? services.arc;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2[0]} {c.h2[1]}</h2><p>{c.headAside.join(" ")}</p></div>
      <ol className="fp-arc">
        {c.rows.map((r) => (
          <li key={r.when}><span className="when">{r.when}</span><div className="fp-card"><h3>{r.h3}</h3><p>{r.p}</p><span className="fp-tags"><span>{r.marker}</span></span></div></li>
        ))}
      </ol>
    </section>
  );
}

/** Route: two cards side by side — start a project (lime) or learn more (plain) */
export function RouteF({ content }: { content?: typeof services.route }) {
  const c = content ?? services.route;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.ask[0]} {c.ask[1]}</h2></div>
      <div className="fp-grid g2">
        <div className="fp-card acc route"><b className="fp-k">{c.col1.label}</b><p>{c.col1.p}</p><Link className="fp-btn" href="/contact">{c.col1.cta} <i aria-hidden><ArrowRight /></i></Link></div>
        <div className="fp-card route"><b className="fp-k">{c.col2.label}</b><p>{c.col2.p}</p><Link className="fl-ghost" href="/about">{c.col2.cta} <ArrowRight /></Link></div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ CONTACT ═══════════════════════════ */
/* (the form itself is the shared DeskForm — Soft restyles it inside .fp-formcard) */
export function ContactHeroF({ content, form }: { content?: typeof contact.desk; form?: typeof contact.deskForm | null }) {
  const c = content ?? contact.desk;
  const f = form ?? contact.deskForm;
  return (
    <section className="fp-sec pad fp-contact">
      <div className="fp-contact-grid">
        <div className="fp-card dark intro">
          <Pill label={first(c.micro)} />
          <h1>{c.h1[0]} <em>{c.h1[1]}</em></h1>
          <p>{c.lede}</p>
          <a className="fp-btn lime" href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp us <i aria-hidden><ArrowRight /></i></a>
          <ul className="fp-channels">
            {c.channels.map((ch) => (
              <li key={ch.ch}><span className="ch">{ch.ch}</span><b>{ch.val}</b><small>{ch.sub}</small></li>
            ))}
          </ul>
        </div>
        {form !== null && <div className="fp-card fp-formcard"><DeskForm content={form ?? undefined} /></div>}
      </div>
      <div className="fp-reassure">
        <div className="fp-card photo"><Photo src={f.photo} note={f.photoNote} /></div>
        <div className="fp-card soft"><p className="ask">{f.ask[0]} {f.ask[1]}</p><p>{f.copy}</p><small className="fp-small"><b>Your details stay private.</b> Used only to reply to this enquiry. No lists, no spam, no sharing.</small></div>
      </div>
    </section>
  );
}

export function ResponseF({ content }: { content?: typeof contact.response }) {
  const c = content ?? contact.response;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2[0]} {c.h2[1]}</h2>{c.lede ? <p>{c.lede}</p> : null}</div>
      <ol className="fp-arc">
        {c.rows.map((r) => <li key={r.when}><span className="when">{r.when}</span><div className="fp-card"><h3>{r.h3}</h3><p>{r.p}</p></div></li>)}
      </ol>
    </section>
  );
}

export function FaqF({ content }: { content?: typeof contact.faq }) {
  const c = content ?? contact.faq;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2[0]} {c.h2[1]}</h2><p>{c.lede}</p></div>
      <div className="fp-faq">
        {c.items.map((it, i) => (
          <details className="fp-card" key={it.qn} open={i === 0}>
            <summary><span className="fp-num">{it.qn}</span><h3>{it.h3}</h3><i aria-hidden>+</i></summary>
            <p>{it.p}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════ PROJECTS ═══════════════════════════ */
export function RegisterF({ content }: { content?: typeof projectsSeed.register }) {
  const c = content ?? projectsSeed.register;
  return (
    <section className="fp-hero pad">
      <div className="fp-hero-copy">
        <Pill label={first(c.micro)} />
        <h1>{c.h1[0]} <span className="fp-word">{c.h1[1]}</span></h1>
        <p>{c.lede}</p>
        <dl className="fp-meta">{c.meta.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl>
      </div>
    </section>
  );
}

/** Featured project as a two-card bento (cover + details), the rest as rounded cards */
export function EntriesF({ content, note }: { content?: ProjectEntry[]; note?: string }) {
  const all = (Array.isArray(content) ? content : projectsSeed.entries) as ProjectEntry[];
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const live = (e: ProjectEntry) => !e.placeholder && s(e.slug).trim().length > 0;
  const href = (e: ProjectEntry) => `/projects/${encodeURIComponent(s(e.slug).trim())}`;
  const art = (e: ProjectEntry, soon = false) => {
    const img = s((e as { cover?: unknown }).cover);
    return img && !soon
      ? <img className="fp-img" src={img} alt={s(e.h2)} loading="lazy" />
      : <Cover name={s(e.h2) || "Next entry"} kind={s(e.type).split(" · ").slice(0, 2).join(" · ")} no={s(e.no)} year={s(e.year)} soon={soon} />;
  };
  const featured = all.find(live);
  const rest = all.filter((e) => e !== featured);
  return (
    <section className="fp-sec pad" id="work">
      {featured && (
        <Link className="fp-feat" href={href(featured)} id={featured.id}>
          <div className="fp-card photo art">{art(featured)}</div>
          <div className="fp-card info">
            <div className="row"><Pill label={first(s(featured.micro)) || "Entry"} />{featured.badge ? <span className="fp-live static"><i />{featured.badge}</span> : null}</div>
            <h2>{featured.h2}</h2>
            <p>{featured.summary}</p>
            <dl className="fp-mini">{(featured.meta ?? []).slice(0, 3).map((m) => <div key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>)}</dl>
            <span className="fp-go">Read the case study <i aria-hidden><ArrowUpRight /></i></span>
          </div>
        </Link>
      )}
      {rest.length > 0 && (
        <div className="fp-grid g2">
          {rest.map((e, i) => live(e) ? (
            <Link className="fp-card proj" href={href(e)} id={e.id} key={e.id || i}>
              <div className="art">{art(e)}</div>
              <div className="cap"><div><h3>{e.h2}</h3><p>{[e.type, e.year].filter(Boolean).join(" · ")}</p></div><span className="fp-go"><i aria-hidden><ArrowUpRight /></i></span></div>
            </Link>
          ) : (
            <div className="fp-card proj soon" id={e.id} key={e.id || i}>
              <div className="art">{art(e, true)}</div>
              <div className="cap"><div><h3>{e.h2 || "Next entry"}</h3><p>{e.summary}</p></div></div>
            </div>
          ))}
        </div>
      )}
      {note ? <p className="fp-note">{note}</p> : null}
    </section>
  );
}

export function ProcessF({ content }: { content?: typeof projectsSeed.process }) {
  const c = content ?? projectsSeed.process;
  return (
    <section className="fp-sec pad">
      <div className="fl-center"><Pill label={first(c.micro)} /><h2>{c.h2[0]} {c.h2[1]}</h2><p>{c.headAside.join(" ")}</p></div>
      <div className="fp-grid g3">
        {c.notes.map((n, i) => (
          <article className={`fp-card${i === 1 ? " acc" : ""}`} key={n.step}><span className="fp-n">{n.step}</span><h3>{n.h3}</h3><p>{n.p}</p></article>
        ))}
      </div>
    </section>
  );
}
