/* ============================================================
   CONTACT PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/contact/wireframe.html (v2)
   Content: lib/seed/contact.json. DeskForm (client-wired) lives in
   contact-form.tsx since S3.
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { CONTACT, WHATSAPP_URL } from "@/lib/content";
import contact from "@/lib/seed/contact.json";

/** 1 · Desk opener + channels ledger + WhatsApp deep-link (P1.4) */
export function Desk() {
  const c = contact.desk;
  return (
    <section className="desk pad">
      <span className="micro">{c.micro}</span>
      <div className="desk-head">
        <div>
          <h1 style={{ marginTop: 18 }}>{c.h1[0]}<br />{c.h1[1]}</h1>
          <p className="lede" style={{ marginTop: 26 }}>{c.lede}</p>
          {/* WhatsApp click-to-chat — mobile opens the app, desktop opens
              web.whatsapp.com; number is env-driven (placeholder till S6) */}
          <a className="action wa-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            WhatsApp us
          </a>
        </div>
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
    </section>
  );
}

/** 3 · Response ledger */
export function ResponseLedger() {
  const c = contact.response;
  return (
    <section className="response pad">
      <div className="response-head">
        <div>
          <span className="micro">{c.micro}</span>
          <h2 style={{ marginTop: 12 }}>{c.h2[0]}<br />{c.h2[1]}</h2>
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
export function Faq() {
  const c = contact.faq;
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
export function QClose() {
  const c = contact.qclose;
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
