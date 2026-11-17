"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS, CONTACT } from "@/lib/content";
import { SoonTag, useDesign } from "./Design";

/**
 * Topbar — 3-zone hairline grid, 82px (brand / nav / call) + burger at ≤1050px.
 * Ported 1:1 from Mira's updated home/wireframe.html (2026-10-13):
 * burger button INSIDE <header.topbar>, .mobilenav drawer as SIBLING below.
 * Client component: one state drives burger + drawer (wireframe's JS toggles
 * both classes together). `.on` = current-page row in the drawer.
 */
export function Topbar({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const d = useDesign();
  const label = d.header.cta.trim() || "Plan a project";
  const arrow = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  const brand = (
    <Link className="cell brandcell" href="/" aria-label="NextBiz Studio — home">
      <Image src="/brand/nb-logo-web.png" alt="" width={40} height={31} className="brandlogo" unoptimized />
      <span className="brandname">NextBiz Studio</span>
    </Link>
  );
  const links = (short: boolean) => NAV_LINKS.map((l) => (
    <Link key={l.href} href={l.href} className={l.href === current ? "on" : undefined} aria-current={l.href === current ? "page" : undefined}>
      {short ? l.label.replace(/^About Us$/, "About") : l.label}
      {l.tag ? <SoonTag fallback={l.tag} /> : null}
    </Link>
  ));
  const cta = <Link className="action dark plancta" href="/plan">{label} {arrow}</Link>;
  const call = (
    <Link className="callbtn" href={`tel:${CONTACT.phoneTel}`} aria-label={`Call ${CONTACT.phoneDisplay}`} title={`Call ${CONTACT.phoneDisplay}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </Link>
  );
  const burger = (
    <button className={`burger${open ? " open" : ""}`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobilenav" onClick={() => setOpen(!open)}>
      <i></i>
    </button>
  );

  return (
    <>
      {d.style === "soft" ? (
        /* ── Soft: logo · floating pill (menu + main button) · round call button ── */
        <header className="topbar pill">
          {brand}
          <div className="pillnav">
            <nav className="topnav" aria-label="Primary">{links(true)}</nav>
            {cta}
          </div>
          {d.header.phone && call}
          {burger}
        </header>
      ) : (
        /* ── Editorial: hairline cells — logo | menu | call + main button ── */
        <header className="topbar ed">
          {brand}
          <nav className="topnav" aria-label="Primary">{links(false)}</nav>
          <div className="cell callcell">{d.header.phone && call}{cta}</div>
          {burger}
        </header>
      )}

      <div className={`mobilenav${open ? " open" : ""}`} id="mobilenav">
        <div className="mn-label"><span>Menu</span><span>Explore</span></div>
        <nav>
          {NAV_LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={[
                l.href === current ? "on" : "",
                i === NAV_LINKS.length - 1 ? "last" : "",
              ].filter(Boolean).join(" ") || undefined}
              onClick={() => setOpen(false)}
            >
              <span className="no">{`0${i + 1}`}</span>
              <span className="lbl">
                {l.label}
                {l.tag ? <SoonTag fallback={l.tag} /> : null}
              </span>
              <svg className="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </nav>
        <Link className="action dark mn-plan" href="/plan" onClick={() => setOpen(false)}>{label} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
        <Link className="mn-call" href={`tel:${CONTACT.phoneTel}`} onClick={() => setOpen(false)}>
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>
            <small>Call Any Time</small>
            <b>{CONTACT.phoneDisplay}</b>
          </span>
        </Link>
      </div>
    </>
  );
}
