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
         FROM page_sections WHERE page_key = $1 AND removed = false ORDER BY sort_order ASC`,
      [pageKey],
    );
    if (rows.length === 0) return sectionsFromSeed(pageKey);
    const out: ResolvedSection[] = [];
    for (const r of rows) {
      if (!r.enabled) continue;
      const base = seed[r.section_key];
      let override = r.content !== null && typeof r.content === "object" ? r.content : undefined;
      // list-shaped sections: only an ARRAY override is meaningful — a junk
      // object override would corrupt the list, so the seed wins instead
      if (Array.isArray(base) && override !== undefined && !Array.isArray(override)) {
        override = undefined;
      }
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

/** Seed default ⊕ a row's stored override for ONE section — what the admin
 *  editor shows and saves (write model = wholesale replace of this value).
 *  List-shaped sections (e.g. projects.entries) carry an ARRAY as content. */
export function seedContentFor(
  pageKey: string,
  sectionKey: string,
  override: unknown,
): Record<string, unknown> | unknown[] {
  const seed = SEEDS[pageKey];
  const base = seed ? seed[sectionKey] : undefined;
  let ov = override !== null && typeof override === "object" ? override : undefined;
  if (Array.isArray(base) && ov !== undefined && !Array.isArray(ov)) {
    ov = undefined; // same guard as getSections: junk object on a list section
  }
  if (base === undefined) return (ov ?? {}) as Record<string, unknown> | unknown[];
  if (ov === undefined) return base as Record<string, unknown> | unknown[];
  return deepMerge(base as Record<string, unknown>, ov as Record<string, unknown>) as
    Record<string, unknown> | unknown[];
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

/** Admin view: on-page rows (with ids) for one page, materializing on first
 *  touch. Removed rows are excluded — they show in the UI's registry. */
export async function getPageRows(pageKey: string): Promise<SectionRow[]> {
  const inv = PAGE_BY_KEY[pageKey];
  if (!inv) throw new Error(`Unknown page: ${pageKey}`);
  await ensurePageRows(pageKey);
  const { rows } = await getPool().query<SectionRow>(
    `SELECT id, section_key, sort_order, enabled, content
       FROM page_sections WHERE page_key = $1 AND removed = false ORDER BY sort_order ASC`,
    [pageKey],
  );
  return rows;
}

/** Add (or re-add) a section from the page's inventory at the end.
 *  Re-adding a soft-removed row reactivates it with its content PRESERVED
 *  (wireframe rule: "removed sections can be re-added, content preserved"). */
export async function addSection(pageKey: string, sectionKey: string): Promise<SectionRow | null> {
  const inv = PAGE_BY_KEY[pageKey];
  if (!inv || !inv.sections.some((s) => s.key === sectionKey)) return null;
  await ensurePageRows(pageKey);
  // reactivate a previously removed row first (content survives)
  const { rows: back } = await getPool().query<SectionRow>(
    `UPDATE page_sections
       SET removed = false, enabled = true,
           sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 10
                           FROM page_sections WHERE page_key = $1 AND removed = false)
     WHERE page_key = $1 AND section_key = $2 AND removed = true
     RETURNING id, section_key, sort_order, enabled, content`,
    [pageKey, sectionKey],
  );
  if (back[0]) return back[0];
  try {
    const { rows } = await getPool().query<SectionRow>(
      `INSERT INTO page_sections (page_key, section_key, sort_order, enabled, content)
       VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM page_sections WHERE page_key = $1 AND removed = false), true, NULL)
       RETURNING id, section_key, sort_order, enabled, content`,
      [pageKey, sectionKey],
    );
    return rows[0];
  } catch {
    return null; // UNIQUE violation = already on page
  }
}

/** Swap a section with its neighbor in one atomic statement. The neighbor is
 *  computed from DB truth (not client-passed values), and BOTH halves of the
 *  swap land in the same statement — there is no window where a navigation or
 *  a racing refresh can cancel half a swap and leave two rows tied on
 *  sort_order (the S5-8 CI red of Oct 22+24: an aborted second PATCH left
 *  register=entries=20 and the public page read the tie). Returns the updated
 *  rows, or an empty list when the section has no neighbor in that direction
 *  (already first/last — a no-op). */
export async function swapSection(
  pageKey: string,
  id: string,
  dir: -1 | 1,
): Promise<SectionRow[]> {
  const { rows } = await getPool().query<SectionRow>(
    `WITH ranked AS (
       SELECT id, section_key, sort_order, enabled, content,
              ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) AS rn
         FROM page_sections
        WHERE page_key = $1 AND removed = false
     ),
     pair AS (
       SELECT me.id AS aid, me.sort_order AS aval,
              nbr.id AS bid, nbr.sort_order AS bval
         FROM ranked me
         JOIN ranked nbr ON nbr.rn = me.rn + $2
        WHERE me.id = $3
     )
     UPDATE page_sections AS p
        SET sort_order = CASE p.id WHEN pair.aid THEN pair.bval WHEN pair.bid THEN pair.aval END,
            updated_at = now()
       FROM pair
      WHERE p.id IN (pair.aid, pair.bid)
      RETURNING p.id, section_key, p.sort_order AS sort_order, enabled, content`,
    [pageKey, dir, id],
  );
  return rows;
}

/** Atomically resequence a whole page's section order (drag-to-reorder).
 *  One statement sets every listed row's sort_order to its list position —
 *  the old path PATCHed each row in parallel, so a navigation mid-storm left
 *  a half-resequenced page. Rows not on the page are ignored. */
export async function resequenceSections(
  pageKey: string,
  order: string[],
): Promise<SectionRow[]> {
  const { rows } = await getPool().query<SectionRow>(
    `UPDATE page_sections AS p
        SET sort_order = t.ord * 10, updated_at = now()
       FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id, ord)
      WHERE p.id = t.id AND p.page_key = $1
      RETURNING p.id, section_key, p.sort_order AS sort_order, enabled, content`,
    [pageKey, order],
  );
  return rows;
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
    if (patch.content === null) {
      // null = clear the override (revert to seed) — used by tests and a
      // future "reset section" affordance
      sets.push(`content = NULL`);
    } else if (typeof patch.content !== "object") {
      throw new Error("content must be a JSON object, array, or null to reset");
    } else {
      sets.push(`content = ${push(JSON.stringify(patch.content))}::jsonb`);
    }
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

/** Remove = soft: flip `removed`, keep the row + content so a re-add from
 *  the registry restores everything (wireframe: hidden ≠ removed; removed
 *  sections land in the registry, content preserved). */
export async function deleteSection(id: string): Promise<boolean> {
  const r = await getPool().query(
    `UPDATE page_sections SET removed = true, updated_at = now() WHERE id = $1`,
    [id],
  );
  return (r.rowCount ?? 0) > 0;
}
