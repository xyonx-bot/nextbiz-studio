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

/** 3 · What happens next — a ruled timeline: four joined cells on one rail, the current step lit */
export function ResponseLedger({ content }: { content?: typeof contact.response }) {
  const c = content ?? contact.response;
  return (
    <section className="cs-sec pad">
      <div className="cs-sec-head">
        <div><span className="micro">{c.micro.replace(/\s*·\s*\d+$/, "")}</span><h2>{c.h2[0]} <span className="cs-dim">{c.h2[1]}</span></h2></div>
        {c.lede ? <p>{c.lede}</p> : null}
      </div>
      <ol className="cs-steps">
        {c.rows.map((r, i) => (
          <li key={r.when} className={i === c.rows.length - 1 ? "alt" : ""}>
            <span className="cs-dot" aria-hidden />
            <span className="cs-when">{r.when}</span>
            <h3>{r.h3}</h3>
            <p>{r.p}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 4 · FAQ — heading on the left, a ruled accordion on the right */
export function Faq({ content }: { content?: typeof contact.faq }) {
  const c = content ?? contact.faq;
  return (
    <section className="cs-sec pad cs-faq">
      <div className="cs-faq-l">
        <span className="micro">{c.micro.replace(/\s*·\s*\d+$/, "")}</span>
        <h2>{c.h2[0]} {c.h2[1]}</h2>
        <p>{c.lede}</p>
        <a className="cs-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ask on WhatsApp</a>
      </div>
      <div className="cs-acc">
        {c.items.map((it, i) => (
          <details key={it.qn} open={i === 0}>
            <summary><span className="cs-qn">{it.qn.replace(/^Q/, "")}</span><span className="cs-q">{it.h3}</span><span className="cs-pm" aria-hidden /></summary>
            <p>{it.p}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** 5 · Close — the ask, then every way to reach us */
export function QClose({ content, channels }: { content?: typeof contact.qclose; channels?: typeof contact.desk.channels }) {
  const c = content ?? contact.qclose;
  return (
    <section className="cs-sec pad cs-close">
      <div className="cs-close-l">
        <span className="micro">{c.micro.replace(/\s*·\s*\d+$/, "")}</span>
        <h2>{c.ask[0]} <span className="cs-mark">{c.ask[1]}</span></h2>
        <p>{c.aside}</p>
      </div>
      <ContactWays channels={channels} />
    </section>
  );
}

/** 1 (Editorial, Nov 18) · The ruled sheet — headline + reply facts, the brief as a grid of hairline
 *  cells, then every way to reach us in a ruled band at the bottom. Replaces the Desk opener. */
export function ContactSheet({ content, form }: { content?: typeof contact.desk; form?: typeof contact.deskForm | null }) {
  const c = content ?? contact.desk;
  return (
    <section className="csheet">
      <div className="cs-head pad">
        <div>
          <span className="micro">{c.micro}</span>
          <h1>{c.h1[0]} {c.h1[1]}</h1>
          <p className="lede">{c.lede.replace(/\s*on the right/i, " below")}</p>
        </div>
      </div>
      {form !== null && <div className="cs-body pad"><DeskForm content={form ?? undefined} variant="sheet" /></div>}
    </section>
  );
}

/** Every way to reach us — a ruled band (closes the Editorial contact page) */
export function ContactWays({ channels }: { channels?: typeof contact.desk.channels }) {
  const list = channels ?? contact.desk.channels;
  const action = (ch: string, val: string) => {
    const k = ch.toLowerCase();
    if (k.includes("call") || k.includes("phone")) return { href: `tel:${CONTACT.phoneTel}`, label: "Call now" };
    if (k.includes("mail")) return { href: `mailto:${val}`, label: "Write an email" };
    if (k.includes("insta")) return { href: `https://instagram.com/${val.replace(/^@/, "")}`, label: "Open Instagram", ext: true };
    if (k.includes("studio") || k.includes("address")) return { href: `https://www.google.com/maps/search/${encodeURIComponent(val)}`, label: "Open map", ext: true };
    return null;
  };
  return (
    <div className="cs-ways">
        <div className="cs-way">
          <span className="micro">WhatsApp</span>
          <b className="live">{CONTACT.phoneDisplay}</b>
          <span>Fastest, usually within an hour</span>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Open chat</a>
        </div>
        {list.map((ch) => {
          const a = action(ch.ch, ch.val);
          return (
            <div className="cs-way" key={ch.ch}>
              <span className="micro">{ch.ch}</span>
              <b>{ch.val}</b>
              <span>{ch.sub}</span>
              {a ? <a href={a.href} {...(a.ext ? { target: "_blank", rel: "noreferrer" } : {})}>{a.label}</a> : null}
            </div>
          );
        })}
      </div>
  );
}
