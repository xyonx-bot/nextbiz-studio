-- NextBizStudio — S4 (M4): lead pipeline + notes
-- Status pipeline new → replied → quoted → won | lost. 'status' column already
-- exists on leads (S1 migration 001). This migration:
--   1. constrains status to the pipeline values (safe: every row today is 'new')
--   2. adds lead_notes: timestamped admin notes, newest first via idx.
-- Idempotent + additive — no drops, no destructive rewrite.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_status_check' AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_status_check;
  END IF;
END $$;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new','replied','quoted','won','lost'));

CREATE TABLE IF NOT EXISTS lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx
  ON lead_notes (lead_id, created_at DESC);
