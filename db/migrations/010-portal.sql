-- 010 — client portal. Idempotent + additive.
-- A client is invited by the studio (from a lead, or created by hand). Clients log in with an emailed
-- 6-digit code, an optional password they set, or a one-time link the studio copies and sends.
-- Files are stored in the database (private — served only to that client or the studio).

CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  business        TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  portal_enabled  BOOLEAN NOT NULL DEFAULT true,
  password_hash   TEXT,                          -- scrypt "salt:hash", NULL = no password set
  invited_at      TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_uq ON clients (lower(email));

CREATE TABLE IF NOT EXISTS client_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  stage       TEXT NOT NULL DEFAULT 'plan' CHECK (stage IN ('plan', 'design', 'build', 'launch', 'care')),
  summary     TEXT,
  plan        JSONB,                             -- copied from the lead's planner result, if any
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_projects_client_idx ON client_projects (client_id, created_at);

CREATE TABLE IF NOT EXISTS project_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_on      DATE,
  done        BOOLEAN NOT NULL DEFAULT false,
  sort        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_milestones_idx ON project_milestones (project_id, sort, created_at);

-- things the studio is waiting on from the client ("Product photos — due 20 Nov")
CREATE TABLE IF NOT EXISTS project_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_on      DATE,
  done        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_requests_idx ON project_requests (project_id, done, created_at);

CREATE TABLE IF NOT EXISTS project_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('file', 'link')),
  url          TEXT,                             -- for links
  mime         TEXT,
  size_bytes   INT,
  data         BYTEA,                            -- for files (private; capped in the app)
  uploaded_by  TEXT NOT NULL CHECK (uploaded_by IN ('client', 'studio')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_files_idx ON project_files (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  file_id     UUID REFERENCES project_files(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_updates_idx ON project_updates (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL CHECK (sender IN ('client', 'studio')),
  body            TEXT NOT NULL,
  file_id         UUID REFERENCES project_files(id) ON DELETE SET NULL,
  read_by_client  BOOLEAN NOT NULL DEFAULT false,
  read_by_studio  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_messages_idx ON project_messages (project_id, created_at);

-- login: emailed codes, one-time links (invite / copied by the studio), sessions — only hashes are stored
CREATE TABLE IF NOT EXISTS client_login_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('code', 'link')),
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  attempts    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_login_tokens_idx ON client_login_tokens (client_id, kind, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS client_login_tokens_hash_uq ON client_login_tokens (token_hash);

CREATE TABLE IF NOT EXISTS client_sessions (
  token_hash  TEXT PRIMARY KEY,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_sessions_client_idx ON client_sessions (client_id);

-- email_log rows can belong to a client too
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
