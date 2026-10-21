import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { PAGE_BY_KEY, updateSection, deleteSection } from "@/lib/config";

/**
 * PATCH  /api/config/pages/[page]/sections/[id] — { content?, sortOrder?, enabled? }
 *        content = a JSON-object PATCH over the seed default (deep-merged at
 *        render; non-object → 400, page never breaks). No redeploy needed.
 * DELETE /api/config/pages/[page]/sections/[id] — remove the section (re-add
 *        via POST restores seed defaults).
 * Self-gated: 401 JSON, never a redirect.
 */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ page: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { page, id } = await ctx.params;
  if (!PAGE_BY_KEY[page]) {
    return NextResponse.json({ error: "unknown page" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }
  try {
    const row = await updateSection(id, {
      content: body.content,
      sortOrder: body.sortOrder as number | undefined,
      enabled: body.enabled as boolean | undefined,
    });
    if (!row) return NextResponse.json({ error: "no such section row" }, { status: 404 });
    revalidatePath(PAGE_BY_KEY[page].path);
    return NextResponse.json({ ok: true, section: row });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { page, id } = await ctx.params;
  if (!PAGE_BY_KEY[page]) {
    return NextResponse.json({ error: "unknown page" }, { status: 404 });
  }
  const removed = await deleteSection(id);
  if (!removed) return NextResponse.json({ error: "no such section row" }, { status: 404 });
  revalidatePath(PAGE_BY_KEY[page].path);
  return NextResponse.json({ ok: true });
}
