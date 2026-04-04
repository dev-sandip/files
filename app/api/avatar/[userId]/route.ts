import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import {
  isExternalAvatarUrl,
  userImageToS3Key,
} from "@/lib/avatar-storage";
import { getBucket, S3 } from "@/lib/S3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;

  const rows = await db
    .select({ image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const image = rows[0]?.image;
  if (!image) {
    return new NextResponse(null, { status: 404 });
  }

  const key = userImageToS3Key(image);
  if (key) {
    try {
      const out = await S3.send(
        new GetObjectCommand({
          Bucket: getBucket(),
          Key: key,
        }),
      );
      if (!out.Body) {
        return new NextResponse(null, { status: 404 });
      }
      const bytes = await out.Body.transformToByteArray();
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      return new NextResponse(ab, {
        headers: {
          "Content-Type": out.ContentType || "image/jpeg",
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (isExternalAvatarUrl(image)) {
    return NextResponse.redirect(image);
  }

  return new NextResponse(null, { status: 404 });
}
