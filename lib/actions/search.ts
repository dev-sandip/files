"use server";

import { db } from "@/db";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { escapeIlikePattern } from "@/lib/search-utils";
import { asc, ilike } from "drizzle-orm";
import { headers } from "next/headers";

const SEARCH_LIMIT = 24;

export type SearchFileHit = {
  kind: "file";
  id: string;
  name: string;
  folderId: string | null;
  mimeType: string;
  sizeBytes: number;
};

export type SearchFolderHit = {
  kind: "folder";
  id: string;
  name: string;
  parentId: string | null;
};

export type SearchStorageResult = {
  folders: SearchFolderHit[];
  files: SearchFileHit[];
};

export async function searchStorageAction(
  rawQuery: string,
): Promise<SearchStorageResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const q = rawQuery.trim();
    if (q.length < 2) {
      return { folders: [], files: [] };
    }
    if (q.length > 120) {
      throw new Error("Search query is too long");
    }

    const pattern = `%${escapeIlikePattern(q)}%`;

    const [folderRows, fileRows] = await Promise.all([
      db
        .select({
          id: storageFolder.id,
          name: storageFolder.name,
          parentId: storageFolder.parentId,
        })
        .from(storageFolder)
        .where(ilike(storageFolder.name, pattern))
        .orderBy(asc(storageFolder.name))
        .limit(SEARCH_LIMIT),
      db
        .select({
          id: storageFile.id,
          name: storageFile.name,
          folderId: storageFile.folderId,
          mimeType: storageFile.mimeType,
          sizeBytes: storageFile.sizeBytes,
        })
        .from(storageFile)
        .where(ilike(storageFile.name, pattern))
        .orderBy(asc(storageFile.name))
        .limit(SEARCH_LIMIT),
    ]);

    return {
      folders: folderRows.map((r) => ({
        kind: "folder" as const,
        id: r.id,
        name: r.name,
        parentId: r.parentId,
      })),
      files: fileRows.map((r) => ({
        kind: "file" as const,
        id: r.id,
        name: r.name,
        folderId: r.folderId,
        mimeType: r.mimeType ?? "",
        sizeBytes: r.sizeBytes,
      })),
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
