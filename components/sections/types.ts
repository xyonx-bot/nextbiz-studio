/** Legal doc seed shape — consumed by components/sections/legal.tsx */
export type LegalBlock =
  | { t: "p"; text: string; muted?: boolean }
  | { t: "ul"; items: string[] }
  | { t: "callout"; label: string; text: string };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  page: string;
  num: string;          // "01" | "02" | "03" | "04"
  h1a: string;
  h1b: string;
  lede: string;
  metaDoc: string;      // "Privacy Policy — Legal 01"
  updated: string;      // "[DATE]" until S6 real copy
  version: string;      // "1.0"
  updatesNote: string;
  sections: LegalSection[];
  siblings: { href: string; label: string }[];
}

/** One project in projects.entries (lib/seed/projects.json) — the single
 *  source for the /projects grid AND the /projects/[slug] case study.
 *  Edited in admin → Pages → Projects → Case entries. `placeholder: true`
 *  renders an "in the making" card with no detail page. */
export interface ProjectShot {
  src: string;
  caption: string;
  frame: string; // "browser" (wide screenshot) | "phone" (tall screenshot)
}

export interface ProjectEntry {
  id: string;
  slug: string;
  placeholder: boolean;
  no: string;
  micro: string;
  h2: string;
  badge: string;
  type: string;
  year: string;
  summary: string;
  liveUrl: string;
  liveLabel: string;
  meta: { k: string; v: string }[];
  photo: string;
  photoNote: string;
  fig: string;
  figRight: string;
  brief: string[];
  approach: string;
  deliverables: string[];
  gallery: ProjectShot[];
  outcomeLabel: string;
  outcome: string;
}
