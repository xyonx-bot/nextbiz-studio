/* ============================================================
   PROJECTS PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/projects/wireframe.html (v2)
   Content: lib/seed/projects.json
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import projects from "@/lib/seed/projects.json";

/** 1 · Volume register — opener w/ table */
export function Register({ content }: { content?: typeof projects.register }) {
  const c = content ?? projects.register;
  return (
    <section className="register pad">
      <span className="micro">{c.micro}</span>
      <div className="register-head" style={{ marginTop: 18 }}>
        <h1>{c.h1[0]}<br />{c.h1[1]}</h1>
        <div>
          <p className="lede">{c.lede}</p>
          <dl className="register-meta">
            {c.meta.map((r) => (
              <div className="row" key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>
            ))}
          </dl>
        </div>
      </div>
      <div className="reg-table">
        <div className="reg-cols">{c.cols.map((h) => <span key={h}>{h}</span>)}</div>
        {c.rows.map((r) => (
          <Link className="reg-row" href={r.href} key={r.no}>
            <span className="no">{r.no}</span>
            <span className="name">{r.name}</span>
            <span className="type">{r.type}</span>
            <span className="year">{r.year}</span>
            <span className="status demo">{r.status}</span>
          </Link>
        ))}
      </div>
      <p className="reg-note">{c.note}</p>
    </section>
  );
}

/** 2 · Case entries ×3 */
export function Entries({ content }: { content?: typeof projects.entries }) {
  const list = content ?? projects.entries;
  return (
    <>
      {list.map((e) => (
        <section className="entry pad" id={e.id} key={e.id}>
          <div className="entry-head">
            <span className="no">{e.no}</span>
            <div className="titles">
              <span className="micro">{e.micro}</span>
              <h2>{e.h2}</h2>
            </div>
            <span className="badge">{e.badge}</span>
          </div>
          <div className="entry-meta">
            {e.meta.map((m) => (
              <span key={m.k}>{m.k} <b>{m.v}</b></span>
            ))}
          </div>
          <div className="entry-photo">
            <div className="imgph">{e.photoNote}</div>
            <div className="photo-caption"><span>{e.fig}</span><span>{e.figRight}</span></div>
          </div>
          <div className="entry-brief">
            {e.brief.map((p, i) => <p className="body-copy" key={i}>{p}</p>)}
          </div>
          <div className="entry-split">
            <div className="approach">
              <span className="micro">The approach</span>
              <p className="body-copy">{e.approach}</p>
            </div>
            <div className="deliver-list">
              {e.deliverables.map((d) => <div className="item" key={d}><i>✓</i>{d}</div>)}
            </div>
          </div>
          <div className="outcome">
            <span className="micro">{e.outcomeLabel}</span>
            <p>{e.outcome}</p>
          </div>
        </section>
      ))}
    </>
  );
}

/** 3 · Process notes */
export function ProcessNotes({ content }: { content?: typeof projects.process }) {
  const c = content ?? projects.process;
  return (
    <section className="process pad">
      <div className="process-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
        </div>
        <span className="micro">{c.headAside[0]}<br />{c.headAside[1]}</span>
      </div>
      <div className="notes">
        {c.notes.map((n) => (
          <div className="note-col" key={n.step}>
            <span className="step">{n.step}</span>
            <h3>{n.h3}</h3>
            <p>{n.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 4 · Compass close */
export function Compass({ content }: { content?: typeof projects.compass }) {
  const c = content ?? projects.compass;
  return (
    <section className="compass pad" style={{ borderTop: 0 }}>
      <div>
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask[0]}<br />{c.ask[1]}</p>
      </div>
      <div className="compass-aside">
        <p>{c.aside}</p>
        <Link className="action dark" href="/contact">{c.cta} <ArrowRight /></Link>
      </div>
    </section>
  );
}
