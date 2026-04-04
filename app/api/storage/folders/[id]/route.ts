import { db } from "@/db";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { getBucket, S3 } from "@/lib/S3Client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

async function collectSubtreeFolderIds(rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await db
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(inArray(storageFolder.parentId, frontier));
    const next = children.map((c) => c.id);
    ids.push(...next);
    frontier = next;
  }
  return ids;
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const folder = await db
    .select()
    .from(storageFolder)
    .where(eq(storageFolder.id, id))
    .limit(1);
  if (!folder.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const folderIds = await collectSubtreeFolderIds(id);
  const files = await db
    .select({ s3Key: storageFile.s3Key })
    .from(storageFile)
    .where(inArray(storageFile.folderId, folderIds));

  const bucket = getBucket();
  for (const { s3Key } of files) {
    await S3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }),
    );
  }

  await db.delete(storageFolder).where(eq(storageFolder.id, id));

  return NextResponse.json({ ok: true });
}
