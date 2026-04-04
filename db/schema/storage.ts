import { relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { pgTable, text, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const storageFolder = pgTable(
  "storage_folder",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => storageFolder.id, {
      onDelete: "cascade",
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("storage_folder_parent_idx").on(table.parentId)],
);

export const storageFile = pgTable(
  "storage_file",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    s3Key: text("s3_key").notNull().unique(),
    folderId: text("folder_id").references(() => storageFolder.id, {
      onDelete: "cascade",
    }),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("storage_file_folder_idx").on(table.folderId),
  ],
);

export const storageFolderRelations = relations(storageFolder, ({ one, many }) => ({
  parent: one(storageFolder, {
    fields: [storageFolder.parentId],
    references: [storageFolder.id],
    relationName: "folderHierarchy",
  }),
  children: many(storageFolder, { relationName: "folderHierarchy" }),
  files: many(storageFile),
}));

export const storageFileRelations = relations(storageFile, ({ one }) => ({
  folder: one(storageFolder, {
    fields: [storageFile.folderId],
    references: [storageFolder.id],
  }),
}));
