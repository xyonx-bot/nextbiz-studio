/* ============================================================
   RESOURCES — free library (Nov 15)
   Hub: register + interactive library + Instagram DM band + waitlist.
   Detail: /resources/[slug]. Home: library teaser + waitlist band.
   Content: lib/seed/resources.json (admin-editable, Pages → Resources).
   Visual language reuses the Projects register (same tokens/rhythm).
   ============================================================ */
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import resources from "@/lib/seed/resources.json";
import type { ResourceEntry } from "./types";
import { Library, GatedContent, EmailCapture } from "./resources-client";
import { accessLabel, accessMode, igDmUrl, isPublished, publicView, resourceHref, snippetOf } from "@/lib/resources";

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const typeLabel = (k: string) => resources.library.types.find((t) => t.key === k)?.label ?? k;

/** Strip gated fields before anything reaches a client component. */
const forCard = (e: ResourceEntry) => {
  const pub = publicView(e).entry;
  return { ...pub, href: resourceHref(e), snippet: snippetOf(pub) };
};

/** 2 · The library */
export function LibrarySection({ entries }: { entries: ResourceEntry[] }) {
  const live = list<ResourceEntry>(entries).filter(isPublished);
  // featured first, otherwise keep admin order
  const ordered = [...live.filter((e) => e.featured), ...live.filter((e) => !e.featured)];
  const L = resources.library;
  return (
    <Library
      entries={ordered.map(forCard)}
      types={L.types}
      searchPlaceholder={L.searchPlaceholder}
      emptyNote={L.emptyNote}
    />
  );
}

/** 3 · Instagram DM band — "DM START" */
export function DmBand({ content }: { content?: typeof resources.dmBand }) {
  const c = content ?? resources.dmBand;
  return (
    <section className="dmband pad">
      <div>
        <span className="micro">{c.micro}</span>
        <h2>{c.h2}</h2>
        <p>{c.body}</p>
      </div>
      <div className="dm-phone" aria-hidden>
        <div className="bubble me">{c.keyword}</div>
        <div className="bubble them">Here you go! Pick what you need 👇</div>
        <div className="dm-btn">Get the full pack</div>
        <div className="dm-btn">New this week</div>
        <div className="dm-btn">Work with us</div>
      </div>
      <a className="action dark" href={igDmUrl(c.handle)} target="_blank" rel="noreferrer">
        {c.cta} · DM “{c.keyword}” <ArrowUpRight />
      </a>
    </section>
  );
}

/** 4 · NextBiz One waitlist (resources page, home, /nextbiz-one) */
export function Waitlist({ content, as = "h2" }: { content?: typeof resources.waitlist; as?: "h1" | "h2" }) {
  const c = content ?? resources.waitlist;
  const H = as;
  return (
    <section className="waitlist" id={c.id || "nextbiz-one"}>
      <div className="wl-inner pad">
        <div>
          <span className="wl-micro"><i />{c.micro}</span>
          <H>{c.h2[0]}<br />{c.h2[1]}</H>
          <p className="wl-body">{c.body}</p>
        </div>
        <div className="wl-side">
          <ul>
            {list<string>(c.points).map((p) => <li key={p}>{p}</li>)}
          </ul>
          <EmailCapture list="nextbiz-one" placeholder={c.placeholder} cta={c.cta} done={c.done} className="wl-form" />
          <p className="wl-fine">{c.fine}</p>
        </div>
      </div>
    </section>
  );
}

/** Home teaser — eyebrow + 3 featured cards + link to the full library */
export function HomeLibrary({
  content, entries,
}: {
  content?: { eyebrow: string; h2: string[]; body: string; cta: string; count?: number };
  entries: ResourceEntry[];
}) {
  const c = content ?? { eyebrow: "Free Library", h2: ["Tools We Use,", "Yours Free."], body: "", cta: "Browse the library", count: 3 };
  const live = list<ResourceEntry>(entries).filter(isPublished);
  const pick = [...live.filter((e) => e.featured), ...live.filter((e) => !e.featured)].slice(0, c.count || 3);
  if (pick.length === 0) return null;
  return (
    <section className="homelib pad">
      <div className="homelib-head">
        <div>
          <span className="eyebrow"><span className="orbit" />{c.eyebrow}</span>
          <h2>{c.h2[0]}<br />{c.h2[1]}</h2>
        </div>
        <div>
          <p className="body-copy">{c.body}</p>
          <Link className="text-link" href="/resources">{c.cta} <ArrowRight /></Link>
        </div>
      </div>
      <div className="lib-grid">
        {pick.map((e, i) => {
          const card = forCard(e);
          return (
            <Link className="rcard" href={card.href} key={e.id || e.slug}>
              <div className="rcard-face">
                <div className="rcard-top">
                  <span className="rtag">{typeLabel(e.type)}</span>
                  <span className="no">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="rcard-snip">{card.snippet}</p>
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
          );
        })}
      </div>
    </section>
  );
}

/** /resources/[slug] — one resource */
export function ResourceDetail({ entry, next }: { entry: ResourceEntry; next?: ResourceEntry }) {
  const v = publicView(entry);
  const e = v.entry;
  const mode = accessMode(entry);
  const inside = list<string>(e.inside).filter(Boolean);
  const steps = list<string>(e.steps).filter(Boolean);
  const dm = resources.dmBand;
  const meta = [
    { k: "Kind", v: typeLabel(e.type) },
    { k: "Works with", v: e.tool },
    { k: "Level", v: e.level },
    { k: "Time", v: e.time },
    { k: "Price", v: accessLabel(e) },
  ].filter((m) => m.v);

  return (
    <>
      <section className="case-head pad">
        <Link className="back" href="/resources">← All resources</Link>
        <div className="case-title">
          <div>
            <span className="micro">{typeLabel(e.type)} · Free resource</span>
            <h1 className="rtitle">{e.title}</h1>
            <p className="lede">{e.summary}</p>
            {mode === "dm" ? (
              <a className="action dark" href={igDmUrl(dm.handle)} target="_blank" rel="noreferrer">
                DM “{e.access?.keyword || dm.keyword}” on Instagram <ArrowUpRight />
              </a>
            ) : mode === "email" ? (
              <a className="action dark" href="#unlock">{e.access?.cta || "Unlock it free"} <ArrowRight /></a>
            ) : e.prompts?.length ? (
              <a className="action dark" href="#prompt-1">Jump to the prompts <ArrowRight /></a>
            ) : null}
          </div>
          <dl className="register-meta">
            {meta.map((m) => (
              <div className="row" key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="case-body pad">
        {inside.length > 0 && (
          <div className="case-row">
            <span className="micro">What&apos;s inside</span>
            <div className="deliver-list">
              {inside.map((d, i) => <div className="item" key={i}><i>✓</i><span>{d}</span></div>)}
            </div>
          </div>
        )}
        {steps.length > 0 && (
          <div className="case-row">
            <span className="micro">How to use it</span>
            <ol className="rsteps">
              {steps.map((s, i) => <li key={i}><span className="no">{String(i + 1).padStart(2, "0")}</span><p>{s}</p></li>)}
            </ol>
          </div>
        )}
      </section>

      <section className="rcontent pad">
        {mode === "dm" ? (
          <div className="gate">
            <div className="gate-box">
              <span className="micro">Delivered on Instagram · free</span>
              <h3>DM “{e.access?.keyword || dm.keyword}” to @{dm.handle}</h3>
              <p>Our DM assistant sends it to you instantly, along with setup notes. You can ask us anything in the same chat.</p>
              <a className="action dark" href={igDmUrl(dm.handle)} target="_blank" rel="noreferrer">Open Instagram <ArrowUpRight /></a>
            </div>
          </div>
        ) : (
          <GatedContent
            slug={entry.slug}
            prompts={list(e.prompts)}
            blocks={list(e.blocks)}
            lockedPrompts={v.lockedPrompts}
            lockedBlocks={v.lockedBlocks}
            hasFile={v.hasFile}
            gated={mode === "email"}
            cta={e.access?.cta || "Unlock the full resource"}
            fileUrl={mode === "open" ? (entry.access?.fileUrl ?? "") : ""}
            fileCta={e.type === "notion" ? "Duplicate to your Notion" : e.type === "n8n" ? "Download the workflow" : "Open the file"}
          />
        )}
      </section>

      <section className="case-outcome pad">
        <div className="outcome">
          <span className="micro">Want this set up for you?</span>
          <p>We build these systems for businesses — automation, AI and WhatsApp/Instagram flows, done for you.</p>
        </div>
        <Link className="action dark" href="/contact">Talk to us <ArrowRight /></Link>
      </section>

      {next && (
        <Link className="case-next pad" href={resourceHref(next)}>
          <span className="micro">Next resource</span>
          <span className="name">{next.title} <ArrowRight /></span>
        </Link>
      )}
    </>
  );
}
