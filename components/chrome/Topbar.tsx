import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS, CONTACT } from "@/lib/content";

const PhoneIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

/**
 * Topbar — 3-zone hairline grid, 82px (brand / nav / call).
 * Ported 1:1 from home/wireframe.html. Mobile ≤760 collapses to brand + menu.
 */
export function Topbar() {
  return (
    <header className="topbar">
      <div className="cell brandcell">
        <Image
          src={`${process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.joyverse.fun"}/nextbiz-studio-dark.png`}
          alt="NextBiz Studio logo"
          width={31}
          height={31}
          className="brandlogo"
          unoptimized
        />
        <span className="brandname">NextBiz Studio</span>
      </div>

      <nav className="topnav" aria-label="Primary">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>

      <Link className="cell callcell" href={`tel:${CONTACT.phoneTel}`}>
        {PhoneIcon}
        <span>
          <small>Call Any Time</small>
          {CONTACT.phoneDisplay}
        </span>
      </Link>

      {/* Mobile menu button — nav list renders in a client drawer */}
    </header>
  );
}
