import { getPool } from "./db";
import pagesSeed from "./seed/pages.json";
import homeSeed from "./seed/home.json";
import aboutSeed from "./seed/about.json";
import servicesSeed from "./seed/services.json";
import projectsSeed from "./seed/projects.json";
import contactSeed from "./seed/contact.json";
import privacySeed from "./seed/legal/privacy.json";
import termsSeed from "./seed/legal/terms.json";
import refundSeed from "./seed/legal/refund.json";
import cookieSeed from "./seed/legal/cookie.json";

/**
 * S5 — page configurator core (P1.8 + P1.9).
 *
 * Render model (technical-plan §3): for each page, ordered section list
 * resolved as  seed-default ⊕ row.content (deep merge). DB empty/missing
 * rows → seed fallback → the page ALWAYS renders (checklist P1.8: invalid
 * or empty config must never take the page down; a DB outage falls back
 * to seed too).
 *
 * page_sections rows are materialized from lib/seed/pages.json on first
 * admin touch (ensurePageRows) — and only on FIRST touch, so a removed
 * section stays removed until explicitly re-added.
 */

export interface PageInventoryEntry {
  key: string;
  title: string;
  navOrder: number;
  path: string;
  sections: Array<{ key: string; label: string }>;
}

export const PAGES: PageInventoryEntry[] = (pagesSeed as { pages: PageInventoryEntry[] }).pages;
export const PAGE_BY_KEY: Record<string, PageInventoryEntry> = Object.fromEntries(
  PAGES.map((p) => [p.key, p]),
);

// seed-default content per page/section (the seed IS the schema)
const SEEDS: Record<string, Record<string, unknown>> = {
  home: homeSeed as Record<string, unknown>,
  about: aboutSeed as Record<string, unknown>,
  services: servicesSeed as Record<string, unknown>,
  projects: projectsSeed as Record<string, unknown>,
  contact: contactSeed as Record<string, unknown>,
  "legal/privacy": { doc: privacySeed },
  "legal/terms": { doc: termsSeed },
  "legal/refund": { doc: refundSeed },
  "legal/cookie": { doc: cookieSeed },
};

export interface ResolvedSection {
  key: string;
  content: unknown;
}

interface SectionRow {
  id: string;
  section_key: string;
  sort_order: number;
  enabled: boolean;
  content: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Seed-default ⊕ override. Plain objects merge recursively; arrays and
 *  scalars replace wholesale (a section's list content is one value). */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override)) {
    out[k] = deepMerge(out[k], v);
  }
  return out as T;
}

/** Seed fallback for a page: sectionOrder when present, else the whole
 *  document as a single "doc" section (legal pages). */
export function sectionsFromSeed(pageKey: string): ResolvedSection[] {
  const seed = SEEDS[pageKey];
  if (!seed) return [];
  if (Array.isArray(seed.sectionOrder)) {
    return (seed.sectionOrder as string[]).map((key) => ({ key, content: seed[key] }));
  }
  // legal pages: SEEDS entry wraps the doc under "doc" so the DB-path
  // lookup (seed[section_key]) stays uniform — unwrap here
  return [{ key: "doc", content: seed.doc ?? seed }];
}

/**
 * Ordered, enabled section list for a public page, content deep-merged.
 * ANY failure (DB down, query error) → seed fallback: page never breaks.
 */
export async function getSections(pageKey: string): Promise<ResolvedSection[]> {
  const seed = SEEDS[pageKey];
  if (!seed) return [];
  try {
    const { rows } = await getPool().query<SectionRow>(
      `SELECT section_key, sort_order, enabled, content
         FROM page_sections WHERE page_key = $1 ORDER BY sort_order ASC`,
      [pageKey],
    );
    if (rows.length === 0) return sectionsFromSeed(pageKey);
    const out: ResolvedSection[] = [];
    for (const r of rows) {
      if (!r.enabled) continue;
      const base = seed[r.section_key];
      const override = isPlainObject(r.content) ? r.content : undefined;
      const content =
        base !== undefined
          ? deepMerge(base, override)
          : (override as Record<string, unknown> | undefined) ?? {};
      out.push({ key: r.section_key, content });
    }
    return out;
  } catch {
    return sectionsFromSeed(pageKey);
  }
}

/** Materialize a page's seed sections into page_sections. Only runs when
 *  the page has ZERO rows — after that, admin mutations are the truth
 *  (a deleted section must not resurrect on the next action). */
export async function ensurePageRows(pageKey: string): Promise<void> {
  const inv = PAGE_BY_KEY[pageKey];
  if (!inv) throw new Error(`Unknown page: ${pageKey}`);
  const pool = getPool();
  await pool.query(
    `INSERT INTO pages_config (page_key, title, nav_order) VALUES ($1, $2, $3)
     ON CONFLICT (page_key) DO NOTHING`,
    [pageKey, inv.title, inv.navOrder],
  );
  const { rows } = await pool.query(
    `SELECT section_key FROM page_sections WHERE page_key = $1`,
    [pageKey],
  );
  if (rows.length > 0) return; // already materialized — never auto-add
  for (const [i, s] of inv.sections.entries()) {
    await pool.query(
      `INSERT INTO page_sections (page_key, section_key, sort_order, enabled, content)
       VALUES ($1, $2, $3, true, NULL)
       ON CONFLICT (page_key, section_key) DO NOTHING`,
      [pageKey, s.key, (i + 1) * 10],
    );
  }
}

/** Admin view: rows (with ids) for one page, materializing on first touch. */
export async function getPageRows(pageKey: string): Promise<SectionRow[]> {
  const inv = PAGE_BY_KEY[pageKey];
  if (!inv) throw new Error(`Unknown page: ${pageKey}`);
  await ensurePageRows(pageKey);
  const { rows } = await getPool().query<SectionRow>(
    `SELECT id, section_key, sort_order, enabled, content
       FROM page_sections WHERE page_key = $1 ORDER BY sort_order ASC`,
    [pageKey],
  );
  return rows;
}

/** Add a section (from the page's inventory) at the end. 409 if present. */
export async function addSection(pageKey: string, sectionKey: string): Promise<SectionRow | null> {
  const inv = PAGE_BY_KEY[pageKey];
  if (!inv || !inv.sections.some((s) => s.key === sectionKey)) return null;
  await ensurePageRows(pageKey);
  try {
    const { rows } = await getPool().query<SectionRow>(
      `INSERT INTO page_sections (page_key, section_key, sort_order, enabled, content)
       VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM page_sections WHERE page_key = $1), true, NULL)
       RETURNING id, section_key, sort_order, enabled, content`,
      [pageKey, sectionKey],
    );
    return rows[0];
  } catch {
    return null; // UNIQUE violation = already on page
  }
}

/** Update one row's content patch / order / enabled state. */
export async function updateSection(
  id: string,
  patch: { content?: unknown; sortOrder?: number; enabled?: boolean },
): Promise<SectionRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  const push = (v: unknown) => `$${vals.push(v)}`;
  if (patch.content !== undefined) {
    if (typeof patch.content !== "object" || patch.content === null || Array.isArray(patch.content)) {
      throw new Error("content must be a JSON object");
    }
    sets.push(`content = ${push(JSON.stringify(patch.content))}::jsonb`);
  }
  if (patch.sortOrder !== undefined) {
    if (typeof patch.sortOrder !== "number" || !Number.isFinite(patch.sortOrder)) {
      throw new Error("sortOrder must be a number");
    }
    sets.push(`sort_order = ${push(patch.sortOrder)}`);
  }
  if (patch.enabled !== undefined) {
    if (typeof patch.enabled !== "boolean") throw new Error("enabled must be a boolean");
    sets.push(`enabled = ${push(patch.enabled)}`);
  }
  if (sets.length === 0) throw new Error("empty patch");
  sets.push(`updated_at = now()`);
  const { rows } = await getPool().query<SectionRow>(
    `UPDATE page_sections SET ${sets.join(", ")} WHERE id = ${push(id)}
     RETURNING id, section_key, sort_order, enabled, content`,
    vals,
  );
  return rows[0] ?? null;
}

/** Remove a section row entirely (re-add restores seed defaults). */
export async function deleteSection(id: string): Promise<boolean> {
  const r = await getPool().query(`DELETE FROM page_sections WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
}
