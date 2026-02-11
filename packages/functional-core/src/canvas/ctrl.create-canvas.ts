import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { SQLiteError } from "bun:sqlite";

type TPortal = {
  db: typeof db;
};

type TArgs = { name: string; automerge_url: string };

type TCanvas = typeof schema.canvas.$inferSelect;

function ctrlCreateCanvas(portal: TPortal, args: TArgs): TErrTuple<TCanvas> {
  try {
    const canvas = { id: crypto.randomUUID(), name: args.name, created_at: new Date(), automerge_url: args.automerge_url };
    const result = portal.db.insert(schema.canvas).values(canvas).returning().all()
    return [result[0], null];
  } catch (error) {
    if (error instanceof SQLiteError) {
      return [null, { code: "CTRL.CANVAS.CREATE_CANVAS.FAILED_SQLITE", statusCode: 500, externalMessage: { en: `Failed to create canvas: ${error.message}` } }];
    }
    console.error(error)
    return [null, { code: "CTRL.CANVAS.CREATE_CANVAS.FAILED", statusCode: 500, externalMessage: { en: "Failed to create canvas" } }];
  }
}

export default ctrlCreateCanvas;
export type { TPortal, TArgs, TCanvas };
