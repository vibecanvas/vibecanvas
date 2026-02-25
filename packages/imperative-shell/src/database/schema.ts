import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from 'drizzle-zod';
import { sql } from "drizzle-orm";

/**
 * @llm-hint DRIZZLE JSON DEFAULTS
 *
 * When using text({ mode: "json" }) columns with default values:
 * - WRONG: .default({}) or .default([]) - JS values are NOT JSON-encoded
 * - RIGHT: .default(sql`'{}'`) or .default(sql`'[]'`) - use sql template literal
 *
 * This applies to any non-primitive default (objects, arrays).
 * Primitives like .default(0), .default("str"), .default(false) work fine.
 *
 * Without sql``, drizzle-kit generates broken migrations where the JS value
 * becomes a string literal in INSERT...SELECT statements.
 *
 * @see https://orm.drizzle.team/docs/guides/empty-array-default-value
 */

export const canvas = sqliteTable("canvas", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  automerge_url: text("automerge_url").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const ZCanvasSelect = createSelectSchema(canvas);

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  canvas_id: text("canvas_id").notNull().references(() => canvas.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  session_id: text("session_id").notNull(),
  local_path: text("local_path").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const ZChatsSelect = createSelectSchema(chats);

export const filetrees = sqliteTable("filetrees", {
  id: text("id").primaryKey(),
  canvas_id: text("canvas_id").notNull().references(() => canvas.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  title: text("title").notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  glob_pattern: text("glob_pattern"),
  created_at: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const ZFileTreeSelect = createSelectSchema(filetrees);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  hash: text("hash").notNull().unique(),
  format: text("format", { enum: ["image/jpeg", "image/png", "image/gif", "image/webp"] }).notNull(),
  base64: text("base64").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const ZFilesSelect = createSelectSchema(files);

export const automerge_repo_data = sqliteTable("automerge_repo_data", {
  key: text("key").notNull().primaryKey(),
  updated_at: text("updated_at").notNull().default(sql`(datetime())`),
  data: blob("data", { mode: "buffer" }).notNull(),
}, (table) => [
  index("automerge_keys").on(table.key),
  index("automerge_updated_at").on(table.updated_at),
]);
