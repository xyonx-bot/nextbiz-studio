"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DESIGN_DEFAULTS, designAttrs, designVars, normalizeDesign, type Design } from "@/lib/design-core";

/**
 * Design settings on the client. The server renders the published (or, for the admin's preview, the draft)
 * design into <html>; in preview mode the admin's Design page posts changes here and they apply instantly.
 */
const Ctx = createContext<Design>(DESIGN_DEFAULTS);
export const useDesign = () => useContext(Ctx);

const ATTRS = ["data-footer", "data-ed-labels", "data-ed-cards", "data-style", "data-tone", "data-soft-blur", "data-soft-lift", "data-round", "data-ed-num", "data-ed-rule", "data-motion", "data-btn", "data-corners", "data-hl", "data-acc-buttons", "data-acc-badges", "data-acc-highlight", "data-acc-nav", "data-acc-details", "data-acc-dark", "data-soon-pulse", "data-glow"];
function apply(d: Design) {
  const el = document.getElementById("nbs-design");
  if (el) el.textContent = `:root{${designVars(d)}}`;
  const html = document.documentElement;
  ATTRS.forEach((a) => html.removeAttribute(a));
  Object.entries(designAttrs(d)).forEach(([k, v]) => html.setAttribute(k, v));
}

export function DesignProvider({ initial, preview, children }: { initial: Design; preview: boolean; children: React.ReactNode }) {
  const [d, setD] = useState(initial);
  const [framed, setFramed] = useState(true);
  const path = usePathname();
  useEffect(() => {
    setFramed(window.self !== window.top);
    if (!preview) return;
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "nbs-design") return;
      const n = normalizeDesign(e.data.design); setD(n); apply(n);
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "nbs-design-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, [preview]);
  return (
    <Ctx.Provider value={d}>
      {children}
      {preview && !framed && !path.startsWith("/admin") && (
        <div className="nbs-preview" role="status">Previewing your draft design
          <a href={`/admin/design/preview?off=1&to=${encodeURIComponent(path)}`}>Exit preview</a></div>
      )}
    </Ctx.Provider>
  );
}

/** Thin strip above the header. Visitors can close it; it comes back when the text changes. */
export function AnnouncementBar() {
  const d = useDesign(), path = usePathname();
  const key = `nbs-bar-${[...d.bar.text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)}`;
  const [closed, setClosed] = useState(false);
  useEffect(() => { try { setClosed(localStorage.getItem(key) === "1"); } catch { /* private mode */ } }, [key]);
  if (!d.bar.on || !d.bar.text.trim() || closed || path.startsWith("/admin")) return null;
  return (
    <div className={`nbs-bar ${d.bar.tone}`} role="region" aria-label="Announcement" data-testid="announcement">
      <span className="dot" aria-hidden />
      <span>{d.bar.text.trim()}</span>
      {d.bar.linkLabel.trim() && d.bar.href && <a href={d.bar.href}>{d.bar.linkLabel.trim()} →</a>}
      <button type="button" aria-label="Close announcement" onClick={() => { setClosed(true); try { localStorage.setItem(key, "1"); } catch { /* ignore */ } }}>×</button>
    </div>
  );
}

/** Wraps the chosen words of a headline so the highlight style can mark them. */
export function Highlight({ text }: { text: string }) {
  const d = useDesign();
  const p = d.highlight.phrase.trim();
  const i = p ? text.toLowerCase().indexOf(p.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<span className="hl">{text.slice(i, i + p.length)}</span>{text.slice(i + p.length)}</>;
}

/** The SOON badge text, from the design settings. */
export function SoonTag({ fallback }: { fallback: string }) {
  const d = useDesign();
  return <span className="navtag">{d.soon.text.trim() || fallback}</span>;
}

/** The footer's closing statement, editable in Admin → Design. */
export function FooterLines() {
  const d = useDesign();
  return <h2>{d.footer.line1.trim() || "Got an idea?"}<br /><em>{d.footer.line2.trim() || "Let\u2019s make it work."}</em></h2>;
}
