/**
 * Client portal — data + login (db/migrations/010-portal.sql).
 *
 * Login, three ways (so email being down never locks a client out):
 *   1. a 6-digit code emailed to the client (15 minutes, 5 tries)
 *   2. an optional password the client sets in the portal (scrypt)
 *   3. a one-time link — sent in the invite email, or copied by the studio and shared on WhatsApp
 * Only hashes of codes, links and session tokens are stored. Sessions are a random cookie
 * (nbs_client) backed by client_sessions, 30 days, revoked when access is turned off.
 */
import { createHmac, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { getPool } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export const STAGES = [
  { id: "plan", label: "Plan" },
  { id: "design", label: "Design" },
  { id: "build", label: "Build" },
  { id: "launch", label: "Launch" },
  { id: "care", label: "Care" },
] as const;
export type Stage = (typeof STAGES)[number]["id"];
export const isStage = (v: string): v is Stage => STAGES.some((s) => s.id === v);

export const FILE_MAX_BYTES = 7 * 1024 * 1024;
const COOKIE = "nbs_client";
const SESSION_DAYS = 30;

/* ── types ── */
export interface Client {
  id: string; name: string; business: string | null; email: string; phone: string | null; lead_id: string | null;
  portal_enabled: boolean; has_password: boolean; invited_at: string | null; last_seen_at: string | null; created_at: string;
}
export interface Project { id: string; client_id: string; title: string; stage: Stage; summary: string | null; plan: unknown; created_at: string; updated_at: string }
export interface Milestone { id: string; title: string; due_on: string | null; done: boolean }
export interface Req { id: string; title: string; due_on: string | null; done: boolean }
export interface FileRow { id: string; name: string; kind: "file" | "link"; url: string | null; mime: string | null; size_bytes: number | null; uploaded_by: "client" | "studio"; created_at: string }
export interface UpdateRow { id: string; body: string; created_at: string; file: FileRow | null }
export interface MessageRow { id: string; sender: "client" | "studio"; body: string; created_at: string; read_by_client: boolean; read_by_studio: boolean; file: FileRow | null }

const CLIENT_COLS = `id, name, business, email, phone, lead_id, portal_enabled, (password_hash IS NOT NULL) AS has_password, invited_at, last_seen_at, created_at`;
const FILE_COLS = `id, name, kind, url, mime, size_bytes, uploaded_by, created_at`;

/* ── hashing ── */
function pepper(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (min 16 chars)");
  return s;
}
export const hashToken = (t: string) => createHmac("sha256", pepper()).update(`portal:${t}`).digest("hex");
export const normEmail = (e: string) => e.trim().toLowerCase();

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const h = await scrypt(pw, salt, 32);
  return `${salt}:${h.toString("hex")}`;
}
export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const h = await scrypt(pw, salt, 32);
  const want = Buffer.from(hex, "hex");
  return want.length === h.length && timingSafeEqual(want, h);
}

/* ── clients ── */
export async function listClients(): Promise<(Client & { projects: number; unread: number; stage: Stage | null })[]> {
  const { rows } = await getPool().query(
    `SELECT c.id, c.name, c.business, c.email, c.phone, c.lead_id, c.portal_enabled, (c.password_hash IS NOT NULL) AS has_password, c.invited_at, c.last_seen_at, c.created_at,
       (SELECT count(*)::int FROM client_projects p WHERE p.client_id = c.id) AS projects,
       (SELECT count(*)::int FROM project_messages m JOIN client_projects p ON p.id = m.project_id
          WHERE p.client_id = c.id AND m.sender = 'client' AND NOT m.read_by_studio) AS unread,
       (SELECT p.stage FROM client_projects p WHERE p.client_id = c.id ORDER BY p.updated_at DESC LIMIT 1) AS stage
     FROM clients c ORDER BY c.created_at DESC`);
  return rows;
}
export async function countUnreadForStudio(): Promise<number> {
  const { rows } = await getPool().query(`SELECT count(*)::int AS n FROM project_messages WHERE sender = 'client' AND NOT read_by_studio`);
  return rows[0]?.n ?? 0;
}
export async function getClient(id: string): Promise<Client | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await getPool().query(`SELECT ${CLIENT_COLS} FROM clients WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
export async function getClientByEmail(email: string): Promise<(Client & { password_hash: string | null }) | null> {
  const { rows } = await getPool().query(`SELECT ${CLIENT_COLS}, password_hash FROM clients WHERE lower(email) = $1`, [normEmail(email)]);
  return rows[0] ?? null;
}
export async function getClientByLead(leadId: string): Promise<Client | null> {
  const { rows } = await getPool().query(`SELECT ${CLIENT_COLS} FROM clients WHERE lead_id = $1 LIMIT 1`, [leadId]);
  return rows[0] ?? null;
}
export async function createClient(input: { name: string; business?: string | null; email: string; phone?: string | null; leadId?: string | null }): Promise<Client> {
  const { rows } = await getPool().query(
    `INSERT INTO clients (name, business, email, phone, lead_id) VALUES ($1, $2, $3, $4, $5) RETURNING ${CLIENT_COLS}`,
    [input.name.trim(), input.business?.trim() || null, normEmail(input.email), input.phone?.trim() || null, input.leadId ?? null]);
  return rows[0];
}
export async function updateClient(id: string, input: { name: string; business?: string | null; email: string; phone?: string | null }) {
  await getPool().query(`UPDATE clients SET name = $2, business = $3, email = $4, phone = $5 WHERE id = $1`,
    [id, input.name.trim(), input.business?.trim() || null, normEmail(input.email), input.phone?.trim() || null]);
}
export async function setPortalEnabled(id: string, on: boolean) {
  await getPool().query(`UPDATE clients SET portal_enabled = $2 WHERE id = $1`, [id, on]);
  if (!on) await getPool().query(`DELETE FROM client_sessions WHERE client_id = $1`, [id]); // log them out everywhere
}
export async function markInvited(id: string) { await getPool().query(`UPDATE clients SET invited_at = now() WHERE id = $1`, [id]); }
export async function setClientPassword(id: string, pw: string | null) {
  await getPool().query(`UPDATE clients SET password_hash = $2 WHERE id = $1`, [id, pw ? await hashPassword(pw) : null]);
}

/* ── login tokens ── */
/** A fresh 6-digit code (older unused codes stop working). Returns null when too many were asked for recently. */
export async function issueLoginCode(clientId: string): Promise<string | null> {
  const db = getPool();
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM client_login_tokens WHERE client_id = $1 AND kind = 'code' AND created_at > now() - interval '1 hour'`, [clientId]);
  if ((rows[0]?.n ?? 0) >= 5) return null;
  await db.query(`UPDATE client_login_tokens SET used_at = now() WHERE client_id = $1 AND kind = 'code' AND used_at IS NULL`, [clientId]);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.query(`INSERT INTO client_login_tokens (client_id, kind, token_hash, expires_at) VALUES ($1, 'code', $2, now() + interval '15 minutes')`,
    [clientId, hashToken(`${clientId}:${code}`)]);
  return code;
}
/** Check a code for an email. Each wrong try counts; after 5 the code is dead. */
export async function verifyLoginCode(email: string, code: string): Promise<Client | null> {
  const c = await getClientByEmail(email);
  if (!c || !c.portal_enabled || !/^\d{6}$/.test(code.trim())) return null;
  const db = getPool();
  const { rows } = await db.query(
    `SELECT id, token_hash, attempts FROM client_login_tokens
      WHERE client_id = $1 AND kind = 'code' AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`, [c.id]);
  const t = rows[0];
  if (!t || t.attempts >= 5) return null;
  if (t.token_hash !== hashToken(`${c.id}:${code.trim()}`)) {
    await db.query(`UPDATE client_login_tokens SET attempts = attempts + 1 WHERE id = $1`, [t.id]);
    return null;
  }
  await db.query(`UPDATE client_login_tokens SET used_at = now() WHERE id = $1`, [t.id]);
  return c;
}
/** One-time login link token (invite: 7 days; copied by the studio: 24 hours). */
export async function issueLoginLink(clientId: string, hours: number): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await getPool().query(`INSERT INTO client_login_tokens (client_id, kind, token_hash, expires_at) VALUES ($1, 'link', $2, now() + make_interval(hours => $3))`,
    [clientId, hashToken(token), hours]);
  return token;
}
export async function consumeLoginLink(token: string): Promise<Client | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { rows } = await getPool().query(
    `UPDATE client_login_tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = 'link' AND used_at IS NULL AND expires_at > now()
      RETURNING client_id`, [hashToken(token)]);
  if (!rows[0]) return null;
  const c = await getClient(rows[0].client_id);
  return c && c.portal_enabled ? c : null;
}
export async function verifyPasswordLogin(email: string, pw: string): Promise<Client | null> {
  const c = await getClientByEmail(email);
  if (!c || !c.portal_enabled || !c.password_hash) { await hashPassword(pw); return null; } // same work either way
  return (await checkPassword(pw, c.password_hash)) ? c : null;
}

/* ── sessions ── */
async function secureReq(): Promise<boolean> {
  const h = await headers();
  return (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim() === "https";
}
export async function startClientSession(clientId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(`INSERT INTO client_sessions (token_hash, client_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), clientId, SESSION_DAYS]);
  await getPool().query(`UPDATE clients SET last_seen_at = now() WHERE id = $1`, [clientId]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: await secureReq(), path: "/", maxAge: SESSION_DAYS * 86400 });
}
/** The logged-in client, or null. Also refreshes "last seen" (at most every 10 minutes). */
export async function currentClient(): Promise<Client | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  try {
    const { rows } = await getPool().query(
      `SELECT c.id FROM client_sessions s JOIN clients c ON c.id = s.client_id
        WHERE s.token_hash = $1 AND s.expires_at > now() AND c.portal_enabled`, [hashToken(token)]);
    if (!rows[0]) return null;
    await getPool().query(`UPDATE clients SET last_seen_at = now() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '10 minutes')`, [rows[0].id]);
    return await getClient(rows[0].id);
  } catch { return null; }
}
export async function endClientSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await getPool().query(`DELETE FROM client_sessions WHERE token_hash = $1`, [hashToken(token)]).catch(() => {});
  jar.delete(COOKIE);
}

/* ── projects ── */
export async function listProjects(clientId: string): Promise<Project[]> {
  const { rows } = await getPool().query(`SELECT * FROM client_projects WHERE client_id = $1 ORDER BY created_at`, [clientId]);
  return rows;
}
export async function getProject(id: string): Promise<Project | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await getPool().query(`SELECT * FROM client_projects WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
export async function createProject(clientId: string, title: string, plan?: unknown, summary?: string | null): Promise<Project> {
  const { rows } = await getPool().query(`INSERT INTO client_projects (client_id, title, plan, summary) VALUES ($1, $2, $3, $4) RETURNING *`,
    [clientId, title.trim(), plan ? JSON.stringify(plan) : null, summary?.trim() || null]);
  return rows[0];
}
export async function updateProject(id: string, input: { title?: string; stage?: Stage; summary?: string | null }) {
  await getPool().query(
    `UPDATE client_projects SET title = COALESCE($2, title), stage = COALESCE($3, stage), summary = CASE WHEN $5 THEN $4 ELSE summary END, updated_at = now() WHERE id = $1`,
    [id, input.title?.trim() || null, input.stage ?? null, input.summary?.trim() || null, input.summary !== undefined]);
}
const touch = (projectId: string) => getPool().query(`UPDATE client_projects SET updated_at = now() WHERE id = $1`, [projectId]);

/* ── milestones & requests ── */
export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const { rows } = await getPool().query(`SELECT id, title, to_char(due_on, 'YYYY-MM-DD') AS due_on, done FROM project_milestones WHERE project_id = $1 ORDER BY done, due_on NULLS LAST, sort, created_at`, [projectId]);
  return rows;
}
export async function addMilestone(projectId: string, title: string, dueOn: string | null) {
  await getPool().query(`INSERT INTO project_milestones (project_id, title, due_on) VALUES ($1, $2, $3)`, [projectId, title.trim(), dueOn || null]);
}
export async function setMilestoneDone(id: string, projectId: string, done: boolean) {
  await getPool().query(`UPDATE project_milestones SET done = $3 WHERE id = $1 AND project_id = $2`, [id, projectId, done]);
}
export async function deleteMilestone(id: string, projectId: string) {
  await getPool().query(`DELETE FROM project_milestones WHERE id = $1 AND project_id = $2`, [id, projectId]);
}
export async function listRequests(projectId: string): Promise<Req[]> {
  const { rows } = await getPool().query(`SELECT id, title, to_char(due_on, 'YYYY-MM-DD') AS due_on, done FROM project_requests WHERE project_id = $1 ORDER BY done, due_on NULLS LAST, created_at`, [projectId]);
  return rows;
}
export async function addRequest(projectId: string, title: string, dueOn: string | null) {
  await getPool().query(`INSERT INTO project_requests (project_id, title, due_on) VALUES ($1, $2, $3)`, [projectId, title.trim(), dueOn || null]);
}
export async function setRequestDone(id: string, projectId: string, done: boolean) {
  await getPool().query(`UPDATE project_requests SET done = $3 WHERE id = $1 AND project_id = $2`, [id, projectId, done]);
}
export async function deleteRequest(id: string, projectId: string) {
  await getPool().query(`DELETE FROM project_requests WHERE id = $1 AND project_id = $2`, [id, projectId]);
}

/* ── files ── */
export async function addFile(projectId: string, f: { name: string; mime: string; data: Buffer; by: "client" | "studio" }): Promise<FileRow> {
  const { rows } = await getPool().query(
    `INSERT INTO project_files (project_id, name, kind, mime, size_bytes, data, uploaded_by) VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING ${FILE_COLS}`,
    [projectId, f.name.slice(0, 200), f.mime.slice(0, 120) || "application/octet-stream", f.data.length, f.data, f.by]);
  await touch(projectId);
  return rows[0];
}
export async function addLink(projectId: string, name: string, url: string, by: "client" | "studio"): Promise<FileRow> {
  const { rows } = await getPool().query(
    `INSERT INTO project_files (project_id, name, kind, url, uploaded_by) VALUES ($1, $2, 'link', $3, $4) RETURNING ${FILE_COLS}`,
    [projectId, name.trim().slice(0, 200), url.trim(), by]);
  await touch(projectId);
  return rows[0];
}
export async function listFiles(projectId: string): Promise<FileRow[]> {
  const { rows } = await getPool().query(`SELECT ${FILE_COLS} FROM project_files WHERE project_id = $1 ORDER BY created_at DESC`, [projectId]);
  return rows;
}
/** A file with its bytes and the client it belongs to (for the access check). */
export async function getFileForDownload(id: string): Promise<(FileRow & { data: Buffer | null; client_id: string }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await getPool().query(
    `SELECT f.${FILE_COLS.split(", ").join(", f.")}, f.data, p.client_id FROM project_files f JOIN client_projects p ON p.id = f.project_id WHERE f.id = $1`, [id]);
  return rows[0] ?? null;
}
export async function deleteFile(id: string, projectId: string) {
  await getPool().query(`DELETE FROM project_files WHERE id = $1 AND project_id = $2`, [id, projectId]);
}

/* ── updates & messages ── */
const withFile = (r: Record<string, unknown>) => ({ ...r, file: r.f_id ? { id: r.f_id, name: r.f_name, kind: r.f_kind, url: r.f_url, mime: r.f_mime, size_bytes: r.f_size, uploaded_by: r.f_by, created_at: r.f_at } : null });
const FILE_JOIN = `LEFT JOIN project_files f ON f.id = x.file_id`;
const FILE_SEL = `f.id AS f_id, f.name AS f_name, f.kind AS f_kind, f.url AS f_url, f.mime AS f_mime, f.size_bytes AS f_size, f.uploaded_by AS f_by, f.created_at AS f_at`;
export async function listUpdates(projectId: string, limit = 50): Promise<UpdateRow[]> {
  const { rows } = await getPool().query(`SELECT x.id, x.body, x.created_at, ${FILE_SEL} FROM project_updates x ${FILE_JOIN} WHERE x.project_id = $1 ORDER BY x.created_at DESC LIMIT $2`, [projectId, limit]);
  return rows.map(withFile) as unknown as UpdateRow[];
}
export async function addUpdate(projectId: string, body: string, fileId: string | null) {
  await getPool().query(`INSERT INTO project_updates (project_id, body, file_id) VALUES ($1, $2, $3)`, [projectId, body.trim(), fileId]);
  await touch(projectId);
}
export async function deleteUpdate(id: string, projectId: string) {
  await getPool().query(`DELETE FROM project_updates WHERE id = $1 AND project_id = $2`, [id, projectId]);
}
export async function listMessages(projectId: string): Promise<MessageRow[]> {
  const { rows } = await getPool().query(`SELECT x.id, x.sender, x.body, x.created_at, x.read_by_client, x.read_by_studio, ${FILE_SEL} FROM project_messages x ${FILE_JOIN} WHERE x.project_id = $1 ORDER BY x.created_at`, [projectId]);
  return rows.map(withFile) as unknown as MessageRow[];
}
export async function addMessage(projectId: string, sender: "client" | "studio", body: string, fileId: string | null) {
  await getPool().query(
    `INSERT INTO project_messages (project_id, sender, body, file_id, read_by_client, read_by_studio) VALUES ($1, $2, $3, $4, $5, $6)`,
    [projectId, sender, body.trim(), fileId, sender === "client", sender === "studio"]);
  await touch(projectId);
}
export async function markMessagesRead(projectId: string, who: "client" | "studio") {
  const col = who === "client" ? "read_by_client" : "read_by_studio";
  await getPool().query(`UPDATE project_messages SET ${col} = true WHERE project_id = $1 AND NOT ${col}`, [projectId]);
}
export async function unreadFor(projectId: string, who: "client" | "studio"): Promise<number> {
  const col = who === "client" ? "read_by_client" : "read_by_studio";
  const { rows } = await getPool().query(`SELECT count(*)::int AS n FROM project_messages WHERE project_id = $1 AND NOT ${col}`, [projectId]);
  return rows[0]?.n ?? 0;
}

/* ── helpers ── */
/** The site's address for links in emails — the host this request came in on (so beta links point at beta). */
export async function siteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) return `${(h.get("x-forwarded-proto") ?? "https").split(",")[0].trim()}://${host}`;
  } catch { /* outside a request */ }
  return (process.env.SITE_URL || "https://nextbizstudio.com").replace(/\/$/, "");
}
export const fmtSize = (n: number | null) => (n == null ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
