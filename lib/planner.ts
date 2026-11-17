/** Project planner — pricing storage (app_settings 'planner'). Never throws: DB down → defaults. */
import { getPool } from "./db";
import { normalizePricing, PRICING_DEFAULTS, type Pricing } from "./planner-core";

export async function getPricing(): Promise<Pricing> {
  try {
    const { rows } = await getPool().query<{ value: unknown }>(`SELECT value FROM app_settings WHERE key = 'planner'`);
    return rows[0] ? normalizePricing(rows[0].value) : PRICING_DEFAULTS;
  } catch { return PRICING_DEFAULTS; }
}

export async function savePricing(raw: unknown): Promise<Pricing> {
  const p = normalizePricing(raw);
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('planner', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(p)]);
  return p;
}
