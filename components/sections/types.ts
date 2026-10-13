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
