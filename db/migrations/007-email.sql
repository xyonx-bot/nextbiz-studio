-- 007 — outgoing email (Resend)
-- email_log: every send attempt (auto thank-you, admin compose, owner alert).
-- lead_notes gains kind 'email' so sent mails show in the lead ledger.
-- Idempotent + additive.

CREATE TABLE IF NOT EXISTS email_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  to_email     TEXT NOT NULL,
  kind         TEXT NOT NULL,            -- lead_ack | lead_alert | compose | test
  theme        TEXT,
  subject      TEXT NOT NULL,
  body         TEXT,                     -- plain-text body as sent
  status       TEXT NOT NULL,            -- sent | failed | skipped
  provider_id  TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_log_lead_idx ON email_log (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_created_idx ON email_log (created_at DESC);

ALTER TABLE lead_notes DROP CONSTRAINT IF EXISTS lead_notes_kind_check;
ALTER TABLE lead_notes ADD CONSTRAINT lead_notes_kind_check
  CHECK (kind IN ('note', 'status', 'system', 'email'));
