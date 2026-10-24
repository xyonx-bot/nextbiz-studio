import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { PAGE_BY_KEY, resequenceSections } from "@/lib/config";

/**
 * POST /api/config/pages/[page]/sections/reorder — { order: [id, id, …] }
 * Atomically sets every listed row's sort_order to its list position
 * ((i+1)*10) in ONE statement. The drag-to-reorder path used to PATCH each
 * row in parallel — a navigation mid-storm stranded a half-resequenced page.
 * Rows not on the page are ignored; the caller's optimistic order is the
 * contract. Self-gated: 401 JSON, never a redirect.
 */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ page: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { page } = await ctx.params;
  if (!PAGE_BY_KEY[page]) {
    return NextResponse.json({ error: "unknown page" }, { status: 404 });
  }
  let body: { order?: unknown };
  try {
    body = (await req.json()) as { order?: unknown };
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }
  if (
    !Array.isArray(body.order) ||
    body.order.length === 0 ||
    !body.order.every((v): v is string => typeof v === "string")
  ) {
    return NextResponse.json({ error: "order must be a non-empty array of section ids" }, { status: 400 });
  }
  const rows = await resequenceSections(page, body.order);
  revalidatePath(PAGE_BY_KEY[page].path);
  return NextResponse.json({ ok: true, updated: rows.length });
}
