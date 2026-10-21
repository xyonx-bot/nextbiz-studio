-- 003 — note kinds (Oct 21, Mira admin redesign port)
-- lead_notes gains a kind so the notes ledger can distinguish:
--   'note'   = desk note typed by the admin
--   'status' = pipeline move, logged as "old → new" (wireframe: inline chips)
--   'system' = capture entry ("Lead captured via contact form. Slack …")
-- Idempotent: CI applies every migration on each deploy.

ALTER TABLE lead_notes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'note';

ALTER TABLE lead_notes DROP CONSTRAINT IF EXISTS lead_notes_kind_check;
ALTER TABLE lead_notes ADD CONSTRAINT lead_notes_kind_check
  CHECK (kind IN ('note', 'status', 'system'));
