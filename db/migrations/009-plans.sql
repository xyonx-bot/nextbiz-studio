-- 009 — project planner: a lead can carry the plan the visitor built on /plan. Idempotent + additive.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS plan JSONB;
