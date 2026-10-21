-- 004 — page configurator (S5, technical-plan §4 schema).
-- pages_config: page inventory (seeded lazily by lib/config.ts ensurePageRows).
-- page_sections: one row per section instance on a page. Content override is
-- a jsonb PATCH over the seed default (deep-merged at render); NULL content
-- = pure seed. Rows are materialized from lib/seed/pages.json on first admin
-- touch — a removed section stays removed until explicitly re-added.
-- Idempotent: CI applies every migration on each deploy.

CREATE TABLE IF NOT EXISTS pages_config (
  page_key text PRIMARY KEY,
  title text NOT NULL,
  nav_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL REFERENCES pages_config(page_key) ON DELETE CASCADE,
  section_key text NOT NULL,
  sort_order float NOT NULL DEFAULT 0,
  enabled bool NOT NULL DEFAULT true,
  content jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key)
);

CREATE INDEX IF NOT EXISTS page_sections_page_idx ON page_sections (page_key, sort_order);
