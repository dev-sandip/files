import { db } from "@/db";
import { storageFile } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { getPreviewKind } from "@/lib/file-preview-kind";
import { getBucket, S3 } from "@/lib/S3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const MAX_TEXT_BYTES = 512 * 1024;

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rows = await db
    .select()
    .from(storageFile)
    .where(eq(storageFile.id, id))
    .limit(1);
  const file = rows[0];
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (getPreviewKind(file.mimeType ?? "", file.name) !== "text") {
    return NextResponse.json(
      { error: "Only plain-text-like files can use this endpoint." },
      { status: 415 },
    );
  }

  const out = await S3.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: file.s3Key,
    }),
  );

  const len = out.ContentLength ?? 0;
  if (len > MAX_TEXT_BYTES) {
    return NextResponse.json(
      { error: "File too large for text preview (max 512 KB)." },
      { status: 413 },
    );
  }

  if (!out.Body) {
    return NextResponse.json({ error: "Empty object" }, { status: 500 });
  }

  const bytes = await out.Body.transformToByteArray();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new NextResponse(ab, {
    headers: {
      "Content-Type": `${file.mimeType || "text/plain"}; charset=utf-8`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
