import { NextResponse } from "next/server";
import { currentClient, getFileForDownload } from "@/lib/portal";
import { isAuthenticated } from "@/lib/auth";

/** Private file download: only the client the project belongs to, or the studio (admin), can open it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFileForDownload(id);
  if (!f) return new NextResponse("Not found", { status: 404 });
  const c = await currentClient();
  const allowed = (c && c.id === f.client_id) || (await isAuthenticated());
  if (!allowed) return new NextResponse("Not found", { status: 404 });
  if (f.kind === "link" && f.url) return NextResponse.redirect(f.url, 302);
  if (!f.data) return new NextResponse("Not found", { status: 404 });
  const safeInline = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/i.test(f.mime ?? "");
  const name = f.name.replace(/[^\w.\- ()]/g, "_");
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": safeInline ? f.mime! : "application/octet-stream",
      "Content-Disposition": `${safeInline ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Content-Length": String(f.data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
