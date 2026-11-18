/* ============================================================
   PROJECT COVER — made by the site
   A designed cover built from the project's own facts (number, name, kind, year), with grain, hairlines
   and the accent colour. When there's a screenshot it sits inside a small browser window at its real
   scale (only the bottom is cut), so it's never zoomed into a crop. Used until real cover art exists;
   Admin → Design → "Project covers" switches between this and the real photo.
   ============================================================ */

import projects from "@/lib/seed/projects.json";

type Props = {
  name: string; kind?: string; no?: string; year?: string; photo?: string;
  soon?: boolean; className?: string;
};

const TONES = ["ink", "sand", "acc"] as const;
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function Cover({ name, kind, no = "01", year, photo, soon, className = "" }: Props) {
  const tone = soon ? "soon" : TONES[(Math.max(1, parseInt(no, 10) || 1) - 1) % TONES.length];
  return (
    <div className={`cover ${className}`} data-tone={tone} role="img" aria-label={soon ? `${name}, in the making` : `${name} — ${kind ?? "project"}`}>
      <span className="cv-grid" aria-hidden />
      <span className="cv-orb" aria-hidden />
      <span className="cv-mono" aria-hidden>{soon ? no : initials(name)}</span>
      <span className="cv-top" aria-hidden>
        <span>No. {no}</span>
        {kind ? <span className="k">{kind}</span> : null}
        <span>{soon ? "On the bench" : year || ""}</span>
      </span>
      <span className="cv-name" aria-hidden>{soon ? "In the making." : name}</span>
      {photo && !soon ? (
        <span className="cv-win" aria-hidden>
          <span className="bar"><i /><i /><i /></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" loading="lazy" />
        </span>
      ) : null}
      <span className="cv-grain" aria-hidden />
    </div>
  );
}

/** Cover facts for a homepage work card: number from its position, year from the matching project entry. */
export function coverFacts(p: { name: string; tags?: string; photo?: string; href?: string }, i: number): Props {
  const slug = (p.href ?? "").split("/projects/")[1];
  const entry = slug ? (projects.entries as { slug?: string; year?: string; no?: string }[]).find((e) => e.slug === slug) : undefined;
  const soon = !p.photo && (/in the making/i.test(p.tags ?? "") || /^next entry$/i.test(p.name));
  return { name: p.name, kind: soon ? undefined : p.tags, no: entry?.no ?? String(i + 1).padStart(2, "0"), year: entry?.year, photo: p.photo, soon };
}
