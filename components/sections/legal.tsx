/* ============================================================
   LEGAL PAGE — shared document pattern (privacy/terms/refund/cookie)
   Ported 1:1 from ~/prototypes/nextbizstudio/legal/privacy/wireframe.html (v2)
   Content: lib/seed/legal/<doc>.json
   ============================================================ */
import Link from "next/link";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import type { LegalDoc } from "./types";

/** Renders one legal document page from its seed. */
export function LegalPage({ doc, current }: { doc: LegalDoc; current: string }) {
  return (
    <main className="shell" id="top">
      <Topbar current={current} />

      {/* 1 · doc header */}
      <section className="doc-head pad">
        <div className="doc-head-top">
          <span className="doc-ver">Legal · Document {doc.num}</span>
          <span className="doc-ver">NextBiz Studio · 2026</span>
        </div>
        <h1>{doc.h1a}<br />{doc.h1b}</h1>
        <div className="doc-stand">
          <p className="lede">{doc.lede}</p>
          <dl className="doc-meta-rows">
            <div><dt>Document</dt><dd>{doc.metaDoc}</dd></div>
            <div><dt>Updated</dt><dd>{doc.updated}</dd></div>
            <div><dt>Version</dt><dd>{doc.version}</dd></div>
          </dl>
        </div>
      </section>

      {/* 2 · body — TOC + article */}
      <section className="doc-body pad">
        <nav className="toc" aria-label="On this page">
          <span className="micro">On this page</span>
          {doc.sections.map((s, i) => (
            <Link key={s.title} href={`#s${String(i + 1).padStart(2, "0")}`} className={i === 0 ? "on" : undefined}>
              <span>{String(i + 1).padStart(2, "0")}</span>{s.title}
            </Link>
          ))}
        </nav>
        <article className="doc-article">
          {doc.sections.map((s, i) => (
            <section key={s.title} id={`s${String(i + 1).padStart(2, "0")}`}>
              <h2><span className="no">SECTION {String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
              {s.blocks.map((b, j) => {
                if (b.t === "p") return <p key={j} className={b.muted ? "muted" : undefined}>{b.text}</p>;
                if (b.t === "ul") return (
                  <ul key={j}>{b.items?.map((li) => <li key={li}>{li}</li>)}</ul>
                );
                if (b.t === "callout") return (
                  <div className="callout" key={j}><b>{b.label}</b>{b.text}</div>
                );
                return null;
              })}
            </section>
          ))}
          <div className="updates">
            <span className="dt">{doc.updated}</span>
            <span>{doc.updatesNote}</span>
          </div>
        </article>
      </section>

      {/* 3 · doc end strip */}
      <section className="doc-end pad">
        <p>This page is part of NextBiz Studio's legal documents. It doesn't replace a conversation — if anything here needs explaining, ask us directly.</p>
        <div className="doc-links">
          {doc.siblings.map((s) => (
            <Link key={s.href} href={s.href}>{s.label}</Link>
          ))}
        </div>
        <span className="scribble scribble-note">Read plainly.<br />Ask freely.</span>
      </section>

      <Footer />
    </main>
  );
}
