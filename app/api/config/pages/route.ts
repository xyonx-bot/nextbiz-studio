import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { PAGES, PAGE_BY_KEY, getPageRows } from "@/lib/config";

/**
 * GET /api/config/pages — admin configurator inventory: every page with its
 * section rows (materialized on first touch). Middleware does NOT cover
 * /api/* — every config route self-gates with a 401 JSON (never a redirect).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pages = [];
  for (const p of PAGES) {
    const rows = await getPageRows(p.key).catch(() => []);
    pages.push({
      key: p.key,
      title: p.title,
      navOrder: p.navOrder,
      path: p.path,
      sections: p.sections.map((s) => {
        const row = rows.find((r) => r.section_key === s.key);
        return {
          key: s.key,
          label: s.label,
          id: row?.id ?? null,
          sortOrder: row?.sort_order ?? null,
          enabled: row?.enabled ?? true,
          onPage: !!row, // absent row = not materialized yet OR removed
        };
      }),
    });
  }
  return NextResponse.json({ ok: true, pages });
}
