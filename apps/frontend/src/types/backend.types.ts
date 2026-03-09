/**
 * Backend Types
 *
 * Types that mirror the database schema from imperative-shell.
 * These represent the source of truth from the server.
 */

import type * as schema from "@vibecanvas/shell/database/schema";

// Canvas ID type used throughout the app
export type TCanvasId = string;

// Canvas table schema
export type TBackendCanvas = typeof schema.canvas.$inferSelect;

// Chats table schema
export type TBackendChat = typeof schema.chats.$inferSelect;

// Filetrees table schema
export type TBackendFileTree = typeof schema.filetrees.$inferSelect;