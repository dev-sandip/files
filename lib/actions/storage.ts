"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { getBucket, S3 } from "@/lib/S3Client";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

function toIso(d: Date | string | null | undefined): string {
  if (d == null) return new Date(0).toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}

export type StorageFolderRow = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
};

export type StorageFileRow = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
};

export async function listStorageAction(
  parentId: string | null,
): Promise<{ folders: StorageFolderRow[]; files: StorageFileRow[] }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    if (parentId) {
      const folder = await db
        .select()
        .from(storageFolder)
        .where(eq(storageFolder.id, parentId))
        .limit(1);
      if (!folder.length) throw new Error("Folder not found");
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

    return {
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: toIso(f.createdAt),
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType ?? "",
        sizeBytes: f.sizeBytes,
        folderId: f.folderId,
        createdAt: toIso(f.createdAt),
      })),
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

const createFolderBody = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
});

export async function createFolderAction(raw: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminUser(session.user)) {
      throw new Error("Forbidden");
    }

    const parsed = createFolderBody.safeParse(raw);
    if (!parsed.success) throw new Error("Invalid body");

    const name = parsed.data.name.trim();
    if (!name || name.includes("/") || name.includes("\\")) {
      throw new Error("Invalid folder name");
    }

    const parentId =
      parsed.data.parentId === undefined ||
      parsed.data.parentId === null ||
      parsed.data.parentId === ""
        ? null
        : parsed.data.parentId;

    if (parentId) {
      const parent = await db
        .select()
        .from(storageFolder)
        .where(eq(storageFolder.id, parentId))
        .limit(1);
      if (!parent.length) throw new Error("Parent folder not found");
    }

    const dup = await db
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(
        and(
          eq(storageFolder.name, name),
          parentId === null
            ? isNull(storageFolder.parentId)
            : eq(storageFolder.parentId, parentId),
        ),
      )
      .limit(1);
    if (dup.length) {
      throw new Error("A folder with this name already exists here");
    }

    const id = uuidv4();
    await db.insert(storageFolder).values({
      id,
      name,
      parentId,
      createdByUserId: session.user.id,
    });

    return { id, name, parentId, createdAt: new Date().toISOString() };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

const renameFolderBody = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(200),
});

export async function renameFolderAction(raw: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminUser(session.user)) {
      throw new Error("Forbidden");
    }

    const parsed = renameFolderBody.safeParse(raw);
    if (!parsed.success) throw new Error("Invalid body");

    const name = parsed.data.name.trim();
    if (!name || name.includes("/") || name.includes("\\")) {
      throw new Error("Invalid folder name");
    }

    const folderId = parsed.data.folderId;
    const rows = await db
      .select()
      .from(storageFolder)
      .where(eq(storageFolder.id, folderId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error("Not found");

    if (row.name === name) {
      return {
        id: folderId,
        name,
        parentId: row.parentId,
        createdAt: toIso(row.createdAt),
      };
    }

    const parentId = row.parentId;

    const dup = await db
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(
        and(
          eq(storageFolder.name, name),
          parentId === null
            ? isNull(storageFolder.parentId)
            : eq(storageFolder.parentId, parentId),
          ne(storageFolder.id, folderId),
        ),
      )
      .limit(1);
    if (dup.length) {
      throw new Error("A folder with this name already exists here");
    }

    await db
      .update(storageFolder)
      .set({ name })
      .where(eq(storageFolder.id, folderId));

    return {
      id: folderId,
      name,
      parentId,
      createdAt: toIso(row.createdAt),
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

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

export async function deleteFolderAction(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminUser(session.user)) {
      throw new Error("Forbidden");
    }

    const folder = await db
      .select()
      .from(storageFolder)
      .where(eq(storageFolder.id, id))
      .limit(1);
    if (!folder.length) throw new Error("Not found");

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
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function deleteFileAction(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminUser(session.user)) {
      throw new Error("Forbidden");
    }

    const rows = await db
      .select()
      .from(storageFile)
      .where(eq(storageFile.id, id))
      .limit(1);
    const file = rows[0];
    if (!file) throw new Error("Not found");

    await S3.send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: file.s3Key }),
    );
    await db.delete(storageFile).where(eq(storageFile.id, id));
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
