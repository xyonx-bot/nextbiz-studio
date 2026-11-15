import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listSubscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

const cell = (raw: string) => {
  const v = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; // no spreadsheet formulas
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** GET /admin/subscribers/export[?list=] — CSV of subscribers (session re-checked). */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.redirect(new URL("/admin/login", req.url));
  const list = new URL(req.url).searchParams.get("list");
  const rows = (await listSubscribers()).filter((r) => !list || r.list === list);
  const csv = ["email,list,source,created_at,last_seen_at",
    ...rows.map((r) => [r.email, r.list, r.source, r.created_at.toISOString(), r.last_seen_at.toISOString()].map(cell).join(","))]
    .join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nextbiz-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
