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

/** One item in resources.entries (lib/seed/resources.json) — the single
 *  source for the /resources library, /resources/[slug] and the unlock API.
 *  Edited in admin → Pages → Resources → Resource entries.
 *  `draft: true` hides it everywhere until its file/link is ready.
 *  access.mode: "open" = everything public · "email" = first `freeCount`
 *  prompts/blocks public, the rest + fileUrl after an email ·
 *  "dm" = delivered by the Instagram DM automation on `keyword`. */
export interface ResourcePrompt { title: string; text: string }
export interface ResourceBlock { h: string; p: string }
export interface ResourceAccess {
  mode: "open" | "email" | "dm";
  freeCount?: number;
  keyword?: string;
  fileUrl?: string;
  cta?: string;
}
export interface ResourceEntry {
  id: string;
  slug: string;
  type: string;           // prompt | notion | n8n | guide (labels: resources.library.types)
  draft?: boolean;
  featured?: boolean;
  title: string;
  summary: string;
  tool?: string;
  level?: string;
  time?: string;
  cover?: string;
  inside?: string[];
  steps?: string[];
  prompts?: ResourcePrompt[];
  blocks?: ResourceBlock[];
  access?: ResourceAccess;
}
