-- 008 — app settings (key → JSON). First user: "email" (auto-reply on/off,
-- auto-reply theme + content, test address). Idempotent + additive.
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
