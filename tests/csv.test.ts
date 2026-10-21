import { describe, expect, it } from "vitest";
import { buildLeadsCsv } from "@/lib/csv";
import type { LeadRow } from "@/lib/db";

/** CSV export (admin topline "Export CSV") — escaping + shape. */
const row = (over: Partial<LeadRow>): LeadRow => ({
  id: "x1", name: "N", phone: null, email: null, service: null,
  budget: null, message: "m", status: "new", ip_hash: null,
  created_at: new Date("2026-10-21T08:00:00Z"), ...over,
});

describe("buildLeadsCsv", () => {
  it("header + one line per lead", () => {
    const csv = buildLeadsCsv([row({ id: "a" }), row({ id: "b" })]);
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toBe("id,created_at,name,phone,email,service,budget,status,message");
    expect(lines).toHaveLength(3);
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = buildLeadsCsv([row({ name: 'He said "hi", then left', message: "line1\nline2" })]);
    expect(csv).toContain('"He said ""hi"", then left"');
    expect(csv).toContain('"line1\nline2"');
  });

  it("empty fields render as empty CSV cells, not null", () => {
    const csv = buildLeadsCsv([row({})]);
    expect(csv).toContain("x1,2026-10-21T08:00:00.000Z,N,,,,,new,m");
  });
});
