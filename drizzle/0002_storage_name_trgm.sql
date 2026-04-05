CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_file_name_trgm_idx" ON "storage_file" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_folder_name_trgm_idx" ON "storage_folder" USING gin ("name" gin_trgm_ops);
