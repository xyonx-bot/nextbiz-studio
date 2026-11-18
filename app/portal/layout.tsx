import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client portal — NextBiz Studio", robots: { index: false, follow: false } };

/** The client portal has its own shell (no site header/footer). Styles: styles/portal.css, scoped to .portal */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal">{children}</div>;
}
