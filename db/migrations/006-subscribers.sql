-- 006: subscribers — emails captured outside the contact form:
--   list = 'resource'    (unlocked a library item; source = resource slug)
--   list = 'nextbiz-one' (NextBiz One waitlist)
--   list = 'newsletter'  (footer newsletter)
-- One row per (email, list, source); repeats only bump last_seen_at.
CREATE TABLE IF NOT EXISTS subscribers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  list         TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT '',
  ip_hash      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_uniq ON subscribers (lower(email), list, source);
CREATE INDEX IF NOT EXISTS subscribers_created_idx ON subscribers (created_at DESC);
