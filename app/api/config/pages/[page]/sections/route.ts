import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { PAGE_BY_KEY, getPageRows, addSection } from "@/lib/config";

/**
 * GET  /api/config/pages/[page]/sections — rows for one page (materialized).
 * POST /api/config/pages/[page]/sections { sectionKey } — add a section from
 * the page's inventory at the end (409 if already on the page).
 * Self-gated: 401 JSON, never a redirect.
 */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ page: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { page } = await ctx.params;
  if (!PAGE_BY_KEY[page]) {
    return NextResponse.json({ error: "unknown page" }, { status: 404 });
  }
  const rows = await getPageRows(page);
  return NextResponse.json({ ok: true, sections: rows });
}

export async function POST(req: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { page } = await ctx.params;
  if (!PAGE_BY_KEY[page]) {
    return NextResponse.json({ error: "unknown page" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }
  const sectionKey = (body as { sectionKey?: unknown })?.sectionKey;
  if (typeof sectionKey !== "string" || !sectionKey) {
    return NextResponse.json({ error: "sectionKey required" }, { status: 400 });
  }
  if (!PAGE_BY_KEY[page].sections.some((s) => s.key === sectionKey)) {
    return NextResponse.json({ error: "unknown section for this page" }, { status: 400 });
  }
  const row = await addSection(page, sectionKey);
  if (!row) {
    return NextResponse.json({ error: "section already on the page" }, { status: 409 });
  }
  revalidatePath(PAGE_BY_KEY[page].path);
  return NextResponse.json({ ok: true, section: row }, { status: 201 });
}
