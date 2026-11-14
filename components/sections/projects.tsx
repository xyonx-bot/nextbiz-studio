/* ============================================================
   PROJECTS PAGE SECTIONS
   Register / process / compass: Mira's wireframe (v2).
   Entries: project index grid → /projects/[slug] case study (Nov 14).
   Content: lib/seed/projects.json (admin-editable, Pages → Projects)
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import projects from "@/lib/seed/projects.json";
import type { ProjectEntry, ProjectShot } from "./types";

/** Admin content is free-form JSON — never trust the shape at render. */
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** A project gets a case-study page only when it's real and has a slug. */
export function isLive(e: ProjectEntry): boolean {
  return !e.placeholder && str(e.slug).trim().length > 0;
}
export const projectHref = (e: ProjectEntry) => `/projects/${encodeURIComponent(str(e.slug).trim())}`;

/** Screenshot in a light browser frame (or the grey placeholder slot). */
function Shot({ src, alt, note, eager }: { src: string; alt: string; note?: string; eager?: boolean }) {
  return (
    <div className="shot">
      <div className="shot-bar"><i /><i /><i /></div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} />
      ) : (
        <div className="imgph">{note}</div>
      )}
    </div>
  );
}

/** 1 · Volume register — opener */
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
            {list<{ k: string; v: string }>(c.meta).map((r) => (
              <div className="row" key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** 2 · Project index — featured card + grid; each live card opens its case study */
export function Entries({ content, note }: { content?: ProjectEntry[]; note?: string }) {
  const all = list<ProjectEntry>(content ?? projects.entries);
  const featured = all.find(isLive);
  const rest = all.filter((e) => e !== featured);
  return (
    <section className="entry pad" id="work">
      {featured && (
        <Link className="feat" href={projectHref(featured)} id={featured.id}>
          <div className="entry-photo">
            <Shot src={str(featured.photo)} alt={str(featured.photoNote) || str(featured.h2)} note={str(featured.photoNote)} eager />
          </div>
          <div className="feat-body">
            <div className="feat-top">
              <span className="no">{featured.no}</span>
              {featured.badge ? <span className="badge live"><i />{featured.badge}</span> : null}
            </div>
            <span className="micro">{featured.micro}</span>
            <h2>{featured.h2}</h2>
            <p className="body-copy">{featured.summary}</p>
            <dl className="feat-meta">
              {list<{ k: string; v: string }>(featured.meta).slice(0, 3).map((m) => (
                <div className="row" key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>
              ))}
            </dl>
            <span className="text-link">Read the case study <ArrowRight /></span>
          </div>
        </Link>
      )}
      {rest.length > 0 && (
        <div className="cards">
          {rest.map((e, i) =>
            isLive(e) ? (
              <Link className="card" href={projectHref(e)} id={e.id} key={e.id || i}>
                <div className="entry-photo">
                  <Shot src={str(e.photo)} alt={str(e.photoNote) || str(e.h2)} note={str(e.photoNote)} />
                </div>
                <div className="card-row">
                  <span className="no">{e.no}</span>
                  <div>
                    <h3>{e.h2} <ArrowUpRight /></h3>
                    <p>{[e.type, e.year].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                {e.summary ? <p className="card-sum">{e.summary}</p> : null}
              </Link>
            ) : (
              <div className="card soon" id={e.id} key={e.id || i}>
                <div className="soon-slot">
                  <span className="no">{e.no}</span>
                  <span className="badge">{e.badge || "In the making"}</span>
                </div>
                <div className="card-row">
                  <div>
                    <h3>{e.h2 || "Next entry"}</h3>
                    <p>{e.summary}</p>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
      {note ? <p className="reg-note">{note}</p> : null}
    </section>
  );
}

/** Case study — /projects/[slug] */
export function CaseStudy({ entry: e, next }: { entry: ProjectEntry; next?: ProjectEntry }) {
  const shots = list<ProjectShot>(e.gallery).filter((g) => str(g?.src));
  const wide = shots.filter((g) => g.frame !== "phone");
  const phones = shots.filter((g) => g.frame === "phone");
  const brief = list<string>(e.brief).filter(Boolean);
  const deliverables = list<string>(e.deliverables).filter(Boolean);
  return (
    <>
      <section className="case-head pad">
        <Link className="back" href="/projects">← All projects</Link>
        <div className="case-title">
          <div>
            <span className="micro">{e.micro}</span>
            <h1>{e.h2}</h1>
            <p className="lede">{e.summary}</p>
            {e.liveUrl ? (
              <a className="action dark" href={e.liveUrl} target="_blank" rel="noreferrer">
                {e.liveLabel || "Visit live site"} <ArrowUpRight />
              </a>
            ) : null}
          </div>
          <dl className="register-meta">
            {list<{ k: string; v: string }>(e.meta).map((m) => (
              <div className="row" key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>
            ))}
            {e.year ? <div className="row"><dt>Year</dt><dd>{e.year}</dd></div> : null}
          </dl>
        </div>
      </section>

      <section className="case-cover pad">
        <Shot src={str(e.photo)} alt={str(e.photoNote) || str(e.h2)} note={str(e.photoNote)} eager />
        {(e.fig || e.figRight) && (
          <div className="photo-caption"><span>{e.fig}</span><span>{e.figRight}</span></div>
        )}
      </section>

      {(brief.length > 0 || e.approach || deliverables.length > 0) && (
        <section className="case-body pad">
          {brief.length > 0 && (
            <div className="case-row">
              <span className="micro">The brief</span>
              <div className="entry-brief">
                {brief.map((p, i) => <p className="body-copy" key={i}>{p}</p>)}
              </div>
            </div>
          )}
          {(e.approach || deliverables.length > 0) && (
            <div className="case-row">
              <span className="micro">The approach</span>
              <div className="entry-split">
                <p className="approach-copy">{e.approach}</p>
                <div className="deliver-list">
                  {deliverables.map((d) => <div className="item" key={d}><i>✓</i>{d}</div>)}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {shots.length > 0 && (
        <section className="case-gallery pad">
          <span className="micro">In detail</span>
          {wide.length > 0 && (
            <div className="shots">
              {wide.map((g) => (
                <figure key={g.src}>
                  <Shot src={g.src} alt={str(g.caption)} />
                  {g.caption ? <figcaption>{g.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          )}
          {phones.length > 0 && (
            <div className="phones">
              {phones.map((g) => (
                <figure key={g.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="phone"><img src={g.src} alt={str(g.caption)} loading="lazy" /></div>
                  {g.caption ? <figcaption>{g.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {e.outcome ? (
        <section className="case-outcome pad">
          <div className="outcome">
            <span className="micro">{e.outcomeLabel}</span>
            <p>{e.outcome}</p>
          </div>
          {e.liveUrl ? (
            <a className="text-link" href={e.liveUrl} target="_blank" rel="noreferrer">
              {e.liveLabel || "Visit live site"} <ArrowUpRight />
            </a>
          ) : null}
        </section>
      ) : null}

      {next && (
        <Link className="case-next pad" href={projectHref(next)}>
          <span className="micro">Next entry · {next.no}</span>
          <span className="name">{next.h2} <ArrowRight /></span>
        </Link>
      )}
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
