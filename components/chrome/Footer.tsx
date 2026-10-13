import Image from "next/image";
import Link from "next/link";
import { LEGAL_LINKS, NAV_LINKS, SERVICE_LINKS } from "@/lib/content";

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://instagram.com/nextbizstudio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/nextbizstudio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v1a6 6 0 0 1 2-1z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@nextbizstudio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
  },
];

/**
 * Footer — HANDOFF §0 contract: brand col + Explore (5) + Services + Legal (×4)
 * + newsletter. Identical on all 9 pages. Newsletter input is decorative in S1
 * (product decision deferred — brief has no email marketing).
 */
export function Footer() {
  const cdn = process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.joyverse.fun";
  return (
    <footer className="footer pad">
      <div className="fcol brand">
        <b className="fbrand">
          <Image
            src={`${cdn}/nextbiz-studio-dark.png`}
            alt="NextBiz Studio logo"
            width={27}
            height={27}
            className="brandlogo"
            unoptimized
          />
          NextBiz Studio
        </b>
        <p>A creative agency focused on building brands, products and experiences that make a difference.</p>
        <div className="socials">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      <div className="fcol">
        <b>Explore</b>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </div>

      <div className="fcol">
        <b>Our Services</b>
        {SERVICE_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </div>

      <div className="fcol">
        <b>Legal</b>
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </div>

      <div className="fcol news">
        <b>Subscribe to our newsletter</b>
        <p>Get the latest updates and insights.</p>
        <form className="row" action="/contact" method="get">
          <input placeholder="Your email address" type="email" name="email" aria-label="Email address" />
          <button type="submit" aria-label="Subscribe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>

      <div className="copyright">
        <span>© {new Date().getFullYear()} NextBiz Studio. All rights reserved.</span>
        <span className="legal">
          <Link href="/legal/privacy">Privacy Policy</Link>
          <Link href="/legal/terms">Terms & Conditions</Link>
        </span>
      </div>
    </footer>
  );
}
