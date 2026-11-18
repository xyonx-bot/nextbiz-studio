/* ============================================================
   PROJECT COVER — "Index card", drawn by the site
   Used wherever a project has no uploaded cover image (Admin → Pages → the project's `cover` field).
   Type only, built from the project's own facts: number, year, kind and name. Screenshots are never
   used here — they stay on the case-study page. Each style draws it its own way (styles/cover.css):
   Editorial = off-white card, hairline frame, lime rule; Soft = rounded card, kind pill, number badge.
   ============================================================ */
import projects from "@/lib/seed/projects.json";

type Props = { name: string; kind?: string; no?: string; year?: string; soon?: boolean; className?: string };

export function Cover({ name, kind, no = "01", year, soon, className = "" }: Props) {
  const label = soon ? "Next entry" : name;
  return (
    <div className={`cover${soon ? " soon" : ""} ${className}`} role="img" aria-label={soon ? `Entry ${no}, in the making` : `${name}${kind ? ` — ${kind}` : ""}`}>
      <span className="cv-meta" aria-hidden><span className="cv-no" data-n={no}>No. {no}</span><span className="cv-yr">{soon ? "On the bench" : year || ""}</span></span>
      <span className="cv-rule" aria-hidden />
      {kind && !soon ? <span className="cv-kind" aria-hidden>{kind}</span> : null}
      <span className="cv-name" aria-hidden>{label}</span>
      <span className="cv-grain" aria-hidden />
    </div>
  );
}

/** Cover facts for a homepage work card: number from its position, year from the matching project entry. */
export function coverFacts(p: { name: string; tags?: string; href?: string }, i: number): Props {
  const slug = (p.href ?? "").split("/projects/")[1];
  const entry = slug ? (projects.entries as { slug?: string; year?: string; no?: string }[]).find((e) => e.slug === slug) : undefined;
  const soon = !entry && (/in the making/i.test(p.tags ?? "") || /^next entry$/i.test(p.name));
  return { name: p.name, kind: soon ? undefined : (p.tags ?? "").split(" · ").slice(0, 2).join(" · "), no: entry?.no ?? String(i + 1).padStart(2, "0"), year: entry?.year, soon };
}
