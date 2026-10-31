/* ============================================================
   CONTACT PAGE SECTIONS — ported from ~/workspaces/mira/prototypes/nextbizstudio/contact/wireframe.html
   v5 TWO-SECTION opener (Oct 20 design-fix bundle, r-nbs-design-fix-oct20):
   Section A: intro (left) | brief form (right, promoted to top)
   Section B: photo+text (left) | channels ledger (right).
   Content: lib/seed/contact.json. DeskForm (client-wired) is embedded
   in Section A since this bundle — lives in contact-form.tsx since S3.
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { CONTACT, WHATSAPP_URL } from "@/lib/content";
import { DeskForm } from "@/components/sections/contact-form";
import contact from "@/lib/seed/contact.json";

/** 1 · Desk opener — v5 two-section (intro|form, divider, photo+text|channels) */
export function Desk({ content, form }: { content?: typeof contact.desk; form?: typeof contact.deskForm | null }) {
  const c = content ?? contact.desk;
  const f = form ?? contact.deskForm;
  return (
    <section className="desk pad">
      {/* Section A: intro | form */}
      <div className="desk-top">
        <div className="desk-intro">
          <span className="micro">{c.micro}</span>
          <h1 style={{ marginTop: 18 }}>{c.h1[0]}<br />{c.h1[1]}</h1>
          <p className="lede" style={{ marginTop: 26 }}>{c.lede}</p>
          {/* WhatsApp click-to-chat (P1.4, S3) — env-driven wa.me deep-link.
              v5 wireframe doesn't draw it; S3 spec keeps it on the page. */}
          <a className="action wa-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            WhatsApp us
          </a>
        </div>
        {/* brief form lives in Section A's right column (v5). The deskForm
            section drives it: disabled/removed → the column stays empty. */}
        {form !== null && <DeskForm content={form ?? undefined} />}
      </div>
      {/* Section B: image+text | channels */}
      <div className="desk-lower">
        <div className="desk-reassure">
          <div className="form-photo">
            {f.photo ? (
              <div className="imgph realimg-box"><img src={f.photo} alt={String(f.photoNote ?? "")} /></div>
            ) : (
              <div className="imgph">{f.photoNote}</div>
            )}
          </div>
          <p className="reassure-ask">{f.ask[0]}<br />{f.ask[1]}</p>
          <p className="reassure-copy">{f.copy}</p>
          <p className="form-note"><b>Your details stay private.</b> Used only to reply to this enquiry — see the <u>Privacy Policy</u>. No lists, no spam, no sharing.</p>
        </div>
        <aside className="desk-side">
          <div className="side-head">
            <span className="micro">{c.sideMicro}</span>
            <div className="channels">
              {c.channels.map((ch) => (
                <div className="channel" key={ch.ch}>
                  <span className="ch">{ch.ch}</span>
                  <span className="val">{ch.val}<small>{ch.sub}</small></span>
                  <span className="note">{ch.note[0]}<br />{ch.note[1]}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="side-ask">{c.sideAsk[0]}<br />{c.sideAsk[1]}<br />{c.sideAsk[2]}</p>
        </aside>
      </div>
    </section>
  );
}

/** 3 · Response ledger */
export function ResponseLedger({ content }: { content?: typeof contact.response }) {
  const c = content ?? contact.response;
  return (
    <section className="response pad">
      <div className="response-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
          {c.lede ? <p className="response-lede">{c.lede}</p> : null}
        </div>
        <span className="micro">{c.headAside[0]}<br />{c.headAside[1]}</span>
      </div>
      <div className="rledger">
        {c.rows.map((r) => (
          <div className="rrow" key={r.when}>
            <span className="when">{r.when}</span>
            <h3>{r.h3}</h3>
            <p>{r.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 4 · Open FAQ */
export function Faq({ content }: { content?: typeof contact.faq }) {
  const c = content ?? contact.faq;
  return (
    <section className="faq pad">
      <div className="faq-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
          <p className="body-copy" style={{ marginTop: 6, maxWidth: "34ch" }}>{c.lede}</p>
        </div>
        <div className="faq-list">
          {c.items.map((it) => (
            <div className="faq-item" key={it.qn}>
              <span className="qn">{it.qn}</span>
              <div><h3>{it.h3}</h3><p>{it.p}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 5 · Quiet close */
export function QClose({ content }: { content?: typeof contact.qclose }) {
  const c = content ?? contact.qclose;
  return (
    <section className="qclose pad">
      <div>
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask[0]}<br />{c.ask[1]}</p>
      </div>
      <div className="qclose-aside">
        <p>{c.aside}</p>
        <Link className="action dark" href={`tel:${CONTACT.phoneTel}`}>{c.cta} <ArrowRight /></Link>
      </div>
    </section>
  );
}
