/**
 * Site design settings — storage (app_settings, migration 008).
 *   design          → what visitors see (published)
 *   design_draft    → what the admin is working on (preview only)
 *   design_history  → the last 10 published versions, newest first (for undo)
 * Read on every request (one row by primary key). The last good copy is kept only as a fallback when the
 * database is unreachable — not as a cache, because Next.js loads server actions and pages as separate module
 * copies, so a cache cleared on publish would not clear for the pages.
 */
import { getPool } from "./db";
import { DESIGN_DEFAULTS, normalizeDesign, type Design } from "./design-core";

export type HistoryItem = { at: string; design: Design };

async function read(key: string): Promise<unknown> {
  const { rows } = await getPool().query<{ value: unknown }>(`SELECT value FROM app_settings WHERE key = $1`, [key]);
  return rows[0]?.value;
}
async function write(key: string, value: unknown) {
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, JSON.stringify(value)]);
}

let lastGood: Design | null = null;
/** What visitors see. Never throws: DB down → last good copy, or the defaults. */
export async function getPublishedDesign(): Promise<Design> {
  try {
    const v = await read("design");
    lastGood = v ? normalizeDesign(v) : DESIGN_DEFAULTS;
    return lastGood;
  } catch { return lastGood ?? DESIGN_DEFAULTS; }
}

export async function getDraftDesign(): Promise<Design> {
  try { const v = await read("design_draft"); return v ? normalizeDesign(v) : await getPublishedDesign(); } catch { return getPublishedDesign(); }
}

export async function getDesignHistory(): Promise<HistoryItem[]> {
  try {
    const v = await read("design_history");
    return Array.isArray(v) ? v.slice(0, 10).map((h) => ({ at: String(h?.at ?? ""), design: normalizeDesign(h?.design) })) : [];
  } catch { return []; }
}

export async function saveDraftDesign(raw: unknown): Promise<Design> {
  const d = normalizeDesign(raw);
  await write("design_draft", d);
  return d;
}

/** Publish: the current live version goes into history, the new one goes live. */
export async function publishDesign(raw: unknown): Promise<Design> {
  const d = normalizeDesign(raw);
  // the version being replaced goes into history — the very first time, that's the original design
  const prev = await read("design").catch(() => null);
  const hist = await getDesignHistory();
  const next = [{ at: new Date().toISOString(), design: prev ? normalizeDesign(prev) : DESIGN_DEFAULTS }, ...hist].slice(0, 10);
  await write("design_history", next);
  await write("design", d);
  await write("design_draft", d);
  lastGood = d;
  return d;
}
