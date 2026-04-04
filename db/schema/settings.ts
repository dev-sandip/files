import { pgTable, text } from "drizzle-orm/pg-core";

/** Single-row and multi-row app settings (key-value). */
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
