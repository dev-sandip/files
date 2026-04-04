import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { userImageToS3Key } from "@/lib/avatar-storage";
import { getBucket, S3 } from "@/lib/S3Client";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 2 MB" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return NextResponse.json(
      { error: "Use JPEG, PNG, WebP, or GIF" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  const previous = await db
    .select({ image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const oldKey = userImageToS3Key(previous[0]?.image ?? null);

  const key = `avatars/${userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await S3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: mime,
      // Cache-friendly; change URL when user re-uploads (path includes version implicitly via replace)
      CacheControl: "public, max-age=31536000",
    }),
  );

  if (
    oldKey &&
    oldKey !== key &&
    oldKey.startsWith(`avatars/${userId}/`)
  ) {
    try {
      await S3.send(
        new DeleteObjectCommand({
          Bucket: getBucket(),
          Key: oldKey,
        }),
      );
    } catch {
      // Best-effort cleanup; new object is already stored.
      console.error(`Failed to delete old avatar: ${oldKey}`);
    }
  }

  /** Store the object key on the user — the app serves it via `/api/avatar/[userId]` (private bucket). */
  return NextResponse.json({ key });
}
