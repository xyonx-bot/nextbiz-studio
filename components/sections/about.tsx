/* ============================================================
   ABOUT PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/about/wireframe.html (v2)
   Content: lib/seed/about.json
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import about from "@/lib/seed/about.json";

const Eyebrow = ({ label }: { label: string }) => (
  <span className="eyebrow"><span className="orbit" />{label}</span>
);

const Placeholder = ({ note, style }: { note: string; style?: React.CSSProperties }) => (
  <div className="imgph" style={style}>{note}</div>
);

/** 1 · Typographic masthead — ghost word + standfirst + photo + metadata ledger */
export function AboutMasthead() {
  const c = about.masthead;
  return (
    <section className="masthead pad">
      <span className="micro">{c.micro}</span>
      <h1 style={{ marginTop: 18 }}>
        {c.h1[0]}<br />
        around <span className="ghost">{c.ghostWord}</span><br />
        {c.h1[2]}
      </h1>
      <div className="standfirst">
        <p className="body-copy standfirst-copy">{c.standfirst}</p>
        <div>
          <div className="stand-photo">
            <Placeholder note={c.photoNote} />
          </div>
          <dl className="ledger">
            {c.ledger.map((r) => (
              <div className="ledger-row" key={r.k}>
                <dt>{r.k}</dt>
                <dd>{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Reading-grid wrapper (sticky side rail) */
export function ReadingGrid({ label, index, children }: { label: string; index: string; children: React.ReactNode }) {
  return (
    <div className="reading pad">
      <aside className="side-rail">
        <span className="side-label"><i /> {label}</span>
        <span className="side-index">{index}</span>
      </aside>
      {children}
    </div>
  );
}

/** 2 · Story lede — 2-col magazine text with drop cap */
export function Story() {
  const c = about.story;
  return (
    <section className="block story">
      <h2>{c.h2[0]}<br />{c.h2[1]}</h2>
      <div className="story-grid">
        <p className="body-copy"><span className="drop">{c.col1Drop}</span>{c.col1.slice(1)}</p>
        <p className="body-copy" dangerouslySetInnerHTML={{ __html: c.col2.replace("Meta Proxy", "<strong>Meta Proxy</strong>") }} />
      </div>
    </section>
  );
}

/** 3 · Definition entries — dictionary rows */
export function Defs() {
  const c = about.defs;
  return (
    <section className="block">
      <h2>{c.h2}</h2>
      <p className="body-copy" style={{ maxWidth: "52ch", marginBottom: 0 }}>{c.lede}</p>
      <div className="defs">
        {c.items.map((d) => (
          <div className="def" key={d.term}>
            <div className="def-term">{d.term}<small>{d.word}</small></div>
            <div className="def-body">
              <p>{d.body}</p>
              <div className="tag-row">{d.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 4 · Method ledger — full-bleed soft band */
export function Method() {
  const c = about.method;
  return (
    <section className="method pad">
      <div className="reading">
        <aside className="side-rail" style={{ paddingTop: 70 }}>
          <span className="side-label"><i /> {c.railLabel}</span>
          <span className="side-index">{c.railIndex}</span>
        </aside>
        <div>
          <div className="method-head">
            <h2>{c.h2}</h2>
            <p className="body-copy" style={{ maxWidth: "50ch", margin: 0 }}>{c.lede}</p>
          </div>
          <div className="mledger">
            {c.rows.map((r) => (
              <div className="mrow" key={r.no}>
                <span className="no">{r.no}</span>
                <div><h3>{r.title}</h3></div>
                <div><p>{r.body}</p><span className="practice">{r.practice}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** 5 · Facts strip + text roster */
export function People() {
  const c = about.people;
  return (
    <section className="block" style={{ borderBottom: 0, paddingBottom: 44 }}>
      <h2 style={{ maxWidth: "22ch" }}>{c.h2}</h2>
      <p className="body-copy" style={{ maxWidth: "56ch" }}>{c.lede}</p>
      <div className="team-photo-accent">
        <Placeholder note={c.photoNote} />
      </div>
      <div className="facts">
        {c.facts.map((f, i) => (
          <div className="fact" key={i}>
            <b>{f.b}{f.sup && <sup>{f.sup}</sup>}</b>
            <span>{f.span}</span>
          </div>
        ))}
      </div>
      <div className="roster" style={{ marginTop: 46 }}>
        {c.roster.map((m) => (
          <div className="member" key={m.idx}>
            <span className="idx">{m.idx}</span>
            <div>
              <b>{m.name}</b>
              <small>{m.desc}</small>
              <span className="focus">{m.focus}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="body-copy" style={{ marginTop: 22, fontSize: 11, color: "var(--muted)", maxWidth: "56ch" }}>{c.note}</p>
    </section>
  );
}

/** 7 · Quiet close — text CTA */
export function AboutClose() {
  const c = about.close;
  return (
    <section className="close pad" style={{ borderTop: "1px solid var(--line)" }}>
      <div>
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask}</p>
      </div>
      <div className="close-aside">
        <p>{c.aside}</p>
        <Link className="action dark" href="/services">{c.cta} <ArrowRight /></Link>
      </div>
    </section>
  );
}
