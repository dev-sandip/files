"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { getBucket, S3 } from "@/lib/S3Client";
import { and, asc, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

function toIso(d: Date | string | null | undefined): string {
  if (d == null) return new Date(0).toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}

const parentFolderAlias = alias(storageFolder, "storage_parent_folder");

async function loadStorageFolderMeta(id: string) {
  const rows = await db
    .select({
      id: storageFolder.id,
      name: storageFolder.name,
      parentId: storageFolder.parentId,
    })
    .from(storageFolder)
    .where(eq(storageFolder.id, id))
    .limit(1);
  return rows[0];
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

export type StorageBreadcrumb = { id: string | null; label: string };

export async function getFolderBreadcrumbsAction(
  folderId: string | null,
): Promise<{ crumbs: StorageBreadcrumb[] }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const root = [{ id: null, label: "Library" }] as StorageBreadcrumb[];
    if (folderId == null || folderId === "") {
      return { crumbs: root };
    }

    const chain: StorageBreadcrumb[] = [];
    let currentId: string | null = folderId;
    const seen = new Set<string>();
    for (let depth = 0; currentId != null && depth < 64; depth += 1) {
      if (seen.has(currentId)) throw new Error("Folder not found");
      seen.add(currentId);
      const row = await loadStorageFolderMeta(currentId);
      if (!row) throw new Error("Folder not found");
      chain.unshift({ id: row.id, label: row.name });
      currentId = row.parentId;
    }

    if (currentId !== null) throw new Error("Folder not found");

    return { crumbs: [...root, ...chain] };
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

export type StorageFileInfo = {
  id: string;
  name: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string; email: string };
  containingFolder: { id: string; name: string } | null;
};

export async function getStorageFileInfoAction(
  fileId: string,
): Promise<StorageFileInfo> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const rows = await db
      .select({
        id: storageFile.id,
        name: storageFile.name,
        s3Key: storageFile.s3Key,
        mimeType: storageFile.mimeType,
        sizeBytes: storageFile.sizeBytes,
        folderId: storageFile.folderId,
        createdAt: storageFile.createdAt,
        uploaderId: user.id,
        uploaderName: user.name,
        uploaderEmail: user.email,
        folderName: storageFolder.name,
      })
      .from(storageFile)
      .innerJoin(user, eq(user.id, storageFile.uploadedByUserId))
      .leftJoin(storageFolder, eq(storageFolder.id, storageFile.folderId))
      .where(eq(storageFile.id, fileId))
      .limit(1);

    const r = rows[0];
    if (!r) throw new Error("Not found");

    return {
      id: r.id,
      name: r.name,
      s3Key: r.s3Key,
      mimeType: r.mimeType ?? "",
      sizeBytes: r.sizeBytes,
      folderId: r.folderId,
      createdAt: toIso(r.createdAt),
      uploadedBy: {
        id: r.uploaderId,
        name: r.uploaderName,
        email: r.uploaderEmail,
      },
      containingFolder:
        r.folderId && r.folderName
          ? { id: r.folderId, name: r.folderName }
          : null,
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export type StorageFolderInfo = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  path: string;
  createdBy: { id: string; name: string; email: string };
  parent: { id: string; name: string } | null;
  stats: { files: number; subfolders: number };
};

export async function getStorageFolderInfoAction(
  folderId: string,
): Promise<StorageFolderInfo> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const rows = await db
      .select({
        id: storageFolder.id,
        name: storageFolder.name,
        parentId: storageFolder.parentId,
        createdAt: storageFolder.createdAt,
        creatorId: user.id,
        creatorName: user.name,
        creatorEmail: user.email,
        parentFolderId: parentFolderAlias.id,
        parentFolderName: parentFolderAlias.name,
      })
      .from(storageFolder)
      .innerJoin(user, eq(user.id, storageFolder.createdByUserId))
      .leftJoin(
        parentFolderAlias,
        eq(parentFolderAlias.id, storageFolder.parentId),
      )
      .where(eq(storageFolder.id, folderId))
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("Not found");

    const [
      [{ files: fileCount }],
      [{ subfolders: subfolderCount }],
      { crumbs: pathCrumbs },
    ] = await Promise.all([
      db
        .select({ files: count() })
        .from(storageFile)
        .where(eq(storageFile.folderId, folderId)),
      db
        .select({ subfolders: count() })
        .from(storageFolder)
        .where(eq(storageFolder.parentId, folderId)),
      getFolderBreadcrumbsAction(folderId),
    ]);
    const path = pathCrumbs.map((c) => c.label).join(" / ");

    return {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      createdAt: toIso(row.createdAt),
      path,
      createdBy: {
        id: row.creatorId,
        name: row.creatorName,
        email: row.creatorEmail,
      },
      parent:
        row.parentId && row.parentFolderId && row.parentFolderName
          ? { id: row.parentFolderId, name: row.parentFolderName }
          : null,
      stats: { files: fileCount, subfolders: subfolderCount },
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
