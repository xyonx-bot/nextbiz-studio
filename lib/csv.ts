import type { LeadRow } from "./db";

/**
 * CSV export (Mira's admin wireframe topline: "Export CSV"). Pure builder so
 * unit tests cover escaping without a DB.
 */
function esc(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildLeadsCsv(leads: LeadRow[]): string {
  const head = "id,created_at,name,phone,email,service,budget,status,message";
  const rows = leads.map((l) =>
    [
      l.id,
      l.created_at.toISOString(),
      l.name,
      l.phone ?? "",
      l.email ?? "",
      l.service ?? "",
      l.budget ?? "",
      l.status,
      l.message,
    ]
      .map((v) => esc(String(v ?? "")))
      .join(","),
  );
  return [head, ...rows].join("\r\n") + "\r\n";
}
