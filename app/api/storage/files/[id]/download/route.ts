import { db } from "@/db";
import { storageFile } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { getBucket, S3 } from "@/lib/S3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

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

  const bucket = getBucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: file.s3Key,
    ResponseContentType: file.mimeType || "application/pdf",
    ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  });

  const url = await getSignedUrl(S3, command, { expiresIn: 300 });

  if (request.headers.get("Accept")?.includes("application/json")) {
    return NextResponse.json({ url });
  }

  return NextResponse.redirect(url);
}
