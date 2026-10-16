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
