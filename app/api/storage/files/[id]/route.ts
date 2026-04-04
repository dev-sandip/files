import { db } from "@/db";
import { storageFile } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { getBucket, S3 } from "@/lib/S3Client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  await S3.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: file.s3Key }),
  );
  await db.delete(storageFile).where(eq(storageFile.id, id));

  return NextResponse.json({ ok: true });
}
