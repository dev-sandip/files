import { db } from "@/db";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parentRaw = searchParams.get("parentId");
  const parentId =
    parentRaw === null || parentRaw === "" || parentRaw === "null"
      ? null
      : parentRaw;

  if (parentId) {
    const folder = await db
      .select()
      .from(storageFolder)
      .where(eq(storageFolder.id, parentId))
      .limit(1);
    if (!folder.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const folders = await db
    .select({
      id: storageFolder.id,
      name: storageFolder.name,
      parentId: storageFolder.parentId,
      createdAt: storageFolder.createdAt,
    })
    .from(storageFolder)
    .where(
      parentId === null
        ? isNull(storageFolder.parentId)
        : eq(storageFolder.parentId, parentId),
    )
    .orderBy(asc(storageFolder.name));

  const files = await db
    .select({
      id: storageFile.id,
      name: storageFile.name,
      mimeType: storageFile.mimeType,
      sizeBytes: storageFile.sizeBytes,
      folderId: storageFile.folderId,
      createdAt: storageFile.createdAt,
    })
    .from(storageFile)
    .where(
      parentId === null
        ? isNull(storageFile.folderId)
        : eq(storageFile.folderId, parentId),
    )
    .orderBy(asc(storageFile.name));

  return NextResponse.json({ folders, files, parentId });
}
