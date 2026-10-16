-- NextBizStudio — leads table (technical-plan §4)
-- Status pipeline: new → replied → quoted → won | lost
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone       TEXT,
  email       TEXT,
  service     TEXT,
  budget      TEXT,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new',
  ip_hash     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notes are S4 (lead_notes table lands with the admin inbox sprint)
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
