import { Pool } from "pg";

/**
 * Postgres client (S3). Connection pooled lazily so unit tests and pages
 * that never touch the DB don't demand DATABASE_URL at import time.
 * In compose the app reaches nextbiz-db over the docker network.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000 });
  }
  return pool;
}

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  status: string;
  ip_hash: string | null;
  created_at: Date;
}

export async function insertLead(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  service?: string | null;
  budget?: string | null;
  message: string;
  ipHash?: string | null;
}): Promise<LeadRow> {
  const { rows } = await getPool().query<LeadRow>(
    `INSERT INTO leads (name, phone, email, service, budget, message, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.name, input.phone ?? null, input.email ?? null,
     input.service ?? null, input.budget ?? null,
     input.message, input.ipHash ?? null],
  );
  return rows[0];
}

export async function countRecentLeadsByIp(ipHash: string, windowMinutes = 60, max = 5): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM leads
     WHERE ip_hash = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
    [ipHash, String(windowMinutes)],
  );
  return rows[0]?.n ?? 0;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ── S4: admin inbox (P1.6) + status pipeline & notes (P1.7) ─────────────

export interface LeadWithNotes extends LeadRow {
  notes: NoteRow[];
}

export interface NoteRow {
  id: string;
  lead_id: string;
  note: string;
  kind: string; // 'note' | 'status' | 'system' (migration 003)
  created_at: Date;
}

/**
 * Inbox list, newest first (P1.6): every lead with key fields + its notes.
 * Notes per lead fetched in one query and grouped in memory — leads count is
 * small (this is a leads inbox, not analytics), so two queries beat a
 * lateral join for clarity.
 */
export async function listLeads(): Promise<LeadWithNotes[]> {
  const leads = await getPool().query<LeadRow>(
    `SELECT * FROM leads ORDER BY created_at DESC`,
  );
  const notes = await getPool().query<NoteRow>(
    `SELECT * FROM lead_notes ORDER BY created_at DESC`,
  );
  const byLead = new Map<string, NoteRow[]>();
  for (const n of notes.rows) {
    const arr = byLead.get(n.lead_id) ?? [];
    arr.push(n);
    byLead.set(n.lead_id, arr);
  }
  return leads.rows.map((l) => ({ ...l, notes: byLead.get(l.id) ?? [] }));
}

/** Total lead count (sidebar badge on every admin page). */
export async function countLeads(): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM leads`);
  return rows[0]?.n ?? 0;
}

/** Single lead + its notes (detail view). */
export async function getLead(id: string): Promise<LeadWithNotes | null> {
  const lead = await getPool().query<LeadRow>(`SELECT * FROM leads WHERE id = $1`, [id]);
  if (lead.rows.length === 0) return null;
  const notes = await getPool().query<NoteRow>(
    `SELECT * FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  return { ...lead.rows[0], notes: notes.rows };
}

/** Move a lead through the pipeline. Returns false for unknown status/id.
 *  Logs the move as a ledger entry ("old → new", kind='status') so the
 *  pipeline stepper + notes ledger can show stage dates + inline chips
 *  (Mira's admin lead-detail wireframe). Same-status moves are no-ops. */
export async function moveLeadStatus(id: string, status: string): Promise<boolean> {
  const client = getPool();
  const cur = await client.query<{ status: string }>(
    `SELECT status FROM leads WHERE id = $1`, [id],
  );
  if (cur.rows.length === 0) return false;
  const old = cur.rows[0].status;
  if (old === status) return true;
  const r = await client.query(`UPDATE leads SET status = $1 WHERE id = $2`, [status, id]);
  if ((r.rowCount ?? 0) > 0) {
    await client.query(
      `INSERT INTO lead_notes (lead_id, note, kind) VALUES ($1, $2, 'status')`,
      [id, `${old} → ${status}`],
    );
  }
  return (r.rowCount ?? 0) > 0;
}

/** System ledger entry (lead capture, etc.) — muted SYS rows in the notes ledger. */
export async function addSystemNote(leadId: string, note: string): Promise<void> {
  await getPool().query(
    `INSERT INTO lead_notes (lead_id, note, kind) VALUES ($1, $2, 'system')`,
    [leadId, note],
  );
}

/** Attach a timestamped note. Returns the stored row. */
export async function addLeadNote(leadId: string, note: string): Promise<NoteRow> {
  const { rows } = await getPool().query<NoteRow>(
    `INSERT INTO lead_notes (lead_id, note) VALUES ($1, $2) RETURNING *`,
    [leadId, note],
  );
  return rows[0];
}
