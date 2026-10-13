/* ============================================================
   CONTACT PAGE SECTIONS — ported 1:1 from ~/prototypes/nextbizstudio/contact/wireframe.html (v2)
   Content: lib/seed/contact.json. Form is UI-only in S2 (backend = S3).
   ============================================================ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { CONTACT } from "@/lib/content";
import contact from "@/lib/seed/contact.json";

/** 1 · Desk opener + channels ledger */
export function Desk() {
  const c = contact.desk;
  return (
    <section className="desk pad">
      <span className="micro">{c.micro}</span>
      <div className="desk-head">
        <div>
          <h1 style={{ marginTop: 18 }}>{c.h1[0]}<br />{c.h1[1]}</h1>
          <p className="lede" style={{ marginTop: 26 }}>{c.lede}</p>
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

/** 2 · Paper form — document-styled brief sheet (static in S2) */
export function DeskForm() {
  const c = contact.deskForm;
  const f = c.fields;
  return (
    <section className="desk-form pad">
      <aside className="form-aside">
        <span className="micro">{c.micro}</span>
        <p className="ask">{c.ask[0]}<br />{c.ask[1]}<br />{c.ask[2]}</p>
        <p className="body-copy">{c.copy}</p>
        <div className="form-photo"><div className="imgph">{c.photoNote}</div></div>
        <p className="form-note"><b>Your details stay private.</b> Used only to reply to this enquiry — see the <u>Privacy Policy</u>. No lists, no spam, no sharing.</p>
      </aside>
      <form className="form-sheet" action="/contact" method="get">
        <div className="f-row">
          <div className="lab">{f.name.label}<small>{f.name.hint}</small></div>
          <div className="field"><input type="text" name="name" placeholder={f.name.placeholder} /></div>
        </div>
        <div className="f-split">
          <div className="col">
            <div className="f-row">
              <div className="lab">{f.phone.label}<small>{f.phone.hint}</small></div>
              <div className="field"><input type="tel" name="phone" placeholder={f.phone.placeholder} /></div>
            </div>
          </div>
          <div className="col">
            <div className="f-row">
              <div className="lab">{f.email.label}<small>{f.email.hint}</small></div>
              <div className="field"><input type="email" name="email" placeholder={f.email.placeholder} /></div>
            </div>
          </div>
        </div>
        <div className="f-row">
          <div className="lab">{f.service.label}<small>{f.service.hint}</small></div>
          <div className="field">
            <select name="service" defaultValue="">
              <option value="">{f.service.placeholder}</option>
              {f.service.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="f-row">
          <div className="lab">{f.budget.label}<small>{f.budget.hint}</small></div>
          <div className="field">
            <select name="budget" defaultValue="">
              <option value="">{f.budget.placeholder}</option>
              {f.budget.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="f-row">
          <div className="lab">{f.brief.label}<small>{f.brief.hint}</small></div>
          <div className="field"><textarea name="brief" placeholder={f.brief.placeholder} /></div>
        </div>
        <label className="f-check"><span className="box" /><span>{c.checkText}</span></label>
        <div className="f-foot">
          <p className="hint">Typical reply: <b>under one business day</b> — from the person who'd actually do the work.</p>
          <button className="action dark f-submit" type="submit">{c.submit}</button>
        </div>
      </form>
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
