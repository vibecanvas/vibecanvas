/**
 * Backend Types
 *
 * Types that mirror the database schema from imperative-shell.
 * These represent the source of truth from the server.
 */

import type * as schema from "@vibecanvas/service-db/schema";

// Canvas ID type used throughout the app
export type TCanvasId = string;

// Canvas table schema
export type TBackendCanvas = typeof schema.canvas.$inferSelect;

// Filetrees table schema
export type TBackendFileTree = typeof schema.filetrees.$inferSelect;