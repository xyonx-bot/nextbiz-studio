-- 011 — project payments + self-service leads. Idempotent + additive.
-- A payment row is either a REQUEST the studio sends (status requested → paid / cancelled)
-- or a RECORD of money the studio received some other way (inserted already paid).
-- Amounts are whole minor units (paise for INR, cents for USD). Clients only ever see their own rows.

CREATE TABLE IF NOT EXISTS project_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
  note            TEXT,
  due_on          DATE,
  blocks_stage    TEXT CHECK (blocks_stage IN ('plan', 'design', 'build', 'launch', 'care')),
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'cancelled')),
  kind            TEXT NOT NULL DEFAULT 'request' CHECK (kind IN ('request', 'record')),
  paid_at         TIMESTAMPTZ,
  paid_via        TEXT,                -- razorpay | upi | bank | cash | other
  paid_ref        TEXT,                -- UTR / Razorpay payment id / note
  rzp_order_id    TEXT,
  rzp_qr_id       TEXT,
  rzp_payment_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_payments_idx ON project_payments (project_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS project_payments_rzp_pay_uq ON project_payments (rzp_payment_id) WHERE rzp_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_payments_order_idx ON project_payments (rzp_order_id) WHERE rzp_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_payments_qr_idx ON project_payments (rzp_qr_id) WHERE rzp_qr_id IS NOT NULL;

-- optional agreed project value, shown in the money summary
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS value_amount BIGINT;
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS value_currency TEXT NOT NULL DEFAULT 'INR';

-- self-service: the visitor chose "no calls, everything in the portal"
ALTER TABLE leads ADD COLUMN IF NOT EXISTS self_service BOOLEAN NOT NULL DEFAULT false;
