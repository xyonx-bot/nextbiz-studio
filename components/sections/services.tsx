/* ============================================================
   SERVICES PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/services/wireframe.html (v2)
   Content: lib/seed/services.json
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import services from "@/lib/seed/services.json";

const Placeholder = ({ note }: { note: string }) => <div className="imgph">{note}</div>;

/** 1 · Catalog index — statement + anchor rows */
export function Catalog({ content }: { content?: typeof services.catalog }) {
  const c = content ?? services.catalog;
  return (
    <section className="catalog pad">
      <span className="micro">{c.micro}</span>
      <h1 style={{ marginTop: 18 }}>{c.h1[0]}<br /><span className="tally">{c.h1[1]}</span></h1>
      <div className="catalog-intro">
        <p className="body-copy">{c.intro}</p>
        <dl className="catalog-meta">
          {c.meta.map((r) => (
            <div className="row" key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="index-list">
        {c.index.map((r) => (
          <Link className="index-row" href={r.href} key={r.no}>
            <span className="no">{r.no}</span>
            <span className="name">{r.name}</span>
            <span className="cat">{r.cat}</span>
            <span className="go">{r.go} <ArrowRight /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** 2 · Capability dossiers ×3 */
export function Dossiers({ content }: { content?: typeof services.dossiers }) {
  const list = content ?? services.dossiers;
  return (
    <>
      {list.map((d) => (
        <section className="dossier pad" id={d.id} key={d.id}>
          <div className="dossier-head">
            <span className="no">{d.no}</span>
            <div className="titles">
              <span className="micro">{d.micro}</span>
              <h2>{d.h2}</h2>
            </div>
          </div>
          <div className="dossier-grid">
            <div className="body-copy">
              {d.copy.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div>
              <div className="includes">
                {d.includes.map((it) => <div className="item" key={it}><i>✓</i>{it}</div>)}
              </div>
              <div className="fit">
                <b>Good fit if</b>
                <p>{d.fit}</p>
              </div>
            </div>
          </div>
          <div className="dossier-foot">
            <Link className="action dark" href="/contact">Discuss this capability <ArrowRight /></Link>
            <span className="ask">{d.foot}</span>
          </div>
        </section>
      ))}
    </>
  );
}

/** 3 · Meta Proxy spec sheet */
export function Spec({ content }: { content?: typeof services.spec }) {
  const c = content ?? services.spec;
  return (
    <section className="spec pad" id="meta-proxy">
      <div className="spec-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>
            {c.h2}
            <span className="micro" style={{ display: "inline", marginLeft: 14, letterSpacing: "1.6px" }}>{c.h2Suffix}</span>
          </h2>
        </div>
        <div className="status">
          <span className="live-dot"><i />{c.statusLine}</span>
          <span className="micro" style={{ letterSpacing: "1.2px" }}>{c.statusMicro}</span>
        </div>
      </div>
      <div className="spec-body">
        <div>
          <p className="spec-lede">{c.lede}</p>
          <div className="spec-photo">
            {c.photo ? (
              <div className="imgph realimg-box"><img src={c.photo} alt={String(c.photoNote ?? "")} /></div>
            ) : (
              <Placeholder note={c.photoNote} />
            )}
          </div>
          <div className="body-copy">
            {c.copy.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
        <div className="sheet">
          <div className="sheet-top"><b>{c.sheetTitle}</b><span>{c.sheetRev}</span></div>
          <dl className="sheet-rows">
            {c.sheetRows.map((r) => (
              <div className="sheet-row" key={r.k}>
                <dt>{r.k}</dt>
                <dd>{r.v}{r.live && <span className="live-dot"><i />{r.live}</span>}</dd>
              </div>
            ))}
          </dl>
          <div className="sheet-foot">
            <p>{c.sheetFoot}</p>
            <Link className="action dark" href="/contact">{c.sheetCta} <ArrowRight /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 4 · Comparison columns */
export function Compare({ content }: { content?: typeof services.compare }) {
  const c = content ?? services.compare;
  return (
    <section className="compare pad">
      <span className="micro">{c.micro}</span>
      <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
      <div className="compare-cols" style={{ marginTop: 36 }}>
        {c.cols.map((col) => (
          <div className="compare-col" key={col.letter}>
            <span className="letter">{col.letter}</span>
            <h3>{col.h3}</h3>
            <p className="body-copy">{col.copy}</p>
            <div className="use">
              {col.use.map((u) => <span key={u}>{u}</span>)}
            </div>
            <span className="pick">{col.pick}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 5 · Engagement arc — text timeline */
export function Arc({ content }: { content?: typeof services.arc }) {
  const c = content ?? services.arc;
  return (
    <section className="arc pad">
      <div className="arc-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
        </div>
        <span className="micro">{c.headAside[0]}<br />{c.headAside[1]}</span>
      </div>
      <div className="arc-list">
        {c.rows.map((r) => (
          <div className="arc-row" key={r.when}>
            <span className="when">{r.when}</span>
            <h3>{r.h3}</h3>
            <p>{r.p}<span className="marker">{r.marker}</span></p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 6 · Route close */
export function Route({ content }: { content?: typeof services.route }) {
  const c = content ?? services.route;
  return (
    <section className="route pad">
      <div>
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask[0]}<br />{c.ask[1]}</p>
      </div>
      <div>
        <div className="route-col">
          <span className="label">{c.col1.label}</span>
          <p>{c.col1.p}</p>
          <Link className="action dark" href="/contact">{c.col1.cta} <ArrowRight /></Link>
        </div>
        <div className="route-col" style={{ marginTop: 34 }}>
          <span className="label">{c.col2.label}</span>
          <p>{c.col2.p}</p>
          <Link className="action" href="/about">{c.col2.cta} <ArrowRight /></Link>
        </div>
      </div>
    </section>
  );
}
