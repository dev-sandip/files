import { db } from "@/db";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { getBucket, S3 } from "@/lib/S3Client";
import { StoragePolicyError, assertUploadAllowed } from "@/lib/storage-policy";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  filename: z.string().min(1).max(500),
  contentType: z.string(),
  size: z.number().int().positive(),
  folderId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const filename = parsed.data.filename.trim();
  const { contentType, size } = parsed.data;
  const folderId =
    parsed.data.folderId === undefined ||
    parsed.data.folderId === null ||
    parsed.data.folderId === ""
      ? null
      : parsed.data.folderId;

  try {
    assertUploadAllowed(filename, contentType, size);
  } catch (e) {
    if (e instanceof StoragePolicyError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  if (folderId) {
    const folder = await db
      .select()
      .from(storageFolder)
      .where(eq(storageFolder.id, folderId))
      .limit(1);
    if (!folder.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const fileId = uuidv4();
  const s3Key = `files/${fileId}/${filename}`;

  await db.insert(storageFile).values({
    id: fileId,
    name: filename,
    s3Key,
    folderId,
    mimeType: contentType || "application/pdf",
    sizeBytes: size,
    uploadedByUserId: session.user.id,
  });

  const bucket = getBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType || "application/pdf",
    ContentLength: size,
  });

  const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 360 });

  return NextResponse.json({ presignedUrl, fileId, key: s3Key });
}
