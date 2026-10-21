import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listLeads } from "@/lib/db";
import { buildLeadsCsv } from "@/lib/csv";

/**
 * GET /admin/export — CSV download of every lead (Mira's inbox wireframe
 * topline: "Export CSV"). Middleware gates /admin/*; this handler re-checks
 * the session itself (defense in depth — a broken matcher must not leak).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const leads = await listLeads();
  const csv = buildLeadsCsv(leads);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nextbiz-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
