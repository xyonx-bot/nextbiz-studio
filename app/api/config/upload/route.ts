import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";
import { isAuthenticated } from "@/lib/auth";

/**
 * POST /api/config/upload — image upload for the Pages configurator (S5-10,
 * Joydip's ask: editable content should include the photos). Multipart
 * form-data: file. Writes to the studio CDN R2 bucket (cdn.joyverse.fun —
 * the same bucket the public site's assets live behind) and returns the
 * public URL; the editor stores it in the section's content (seed key like
 * `photo`), public pages render it live on save — no redeploy.
 *
 * Self-gated (middleware does not cover /api/*): 401 JSON, never a redirect.
 * Image mimetypes only, 5 MB cap, hashed object keys under nbs/pages/.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const keyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secret = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_CDN_BUCKET;
  // env may carry the bare domain — normalize to a full https origin
  const cdnRaw = process.env.CDN_PUBLIC_DOMAIN ?? "https://cdn.joyverse.fun";
  const cdn = (cdnRaw.startsWith("http") ? cdnRaw : `https://${cdnRaw}`).replace(/\/$/, "");
  if (!accountId || !keyId || !secret || !bucket) {
    return NextResponse.json(
      { error: "uploads not configured — R2 env missing on the server" },
      { status: 503 },
    );
  }

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) throw new Error("no file");
    file = f;
  } catch {
    return NextResponse.json({ error: "multipart body with `file` required" }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "only PNG / JPEG / WebP / AVIF / GIF allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "image must be under 5 MB" }, { status: 400 });

  const objectKey = `nbs/pages/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const endpoint = process.env.R2_S3_ENDPOINT?.replace(/\/$/, "")
    ?? `https://${accountId}.r2.cloudflarestorage.com`;
  const r2 = new AwsClient({ accessKeyId: keyId, secretAccessKey: secret, service: "s3" });
  const body = new Uint8Array(await file.arrayBuffer());
  const put = await r2.fetch(`${endpoint}/${bucket}/${objectKey}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    return NextResponse.json({ error: `CDN write failed (${put.status})` }, { status: 502 });
  }
  const url = `${cdn}/${objectKey}`;
  return NextResponse.json({ ok: true, url }, { status: 201 });
}
