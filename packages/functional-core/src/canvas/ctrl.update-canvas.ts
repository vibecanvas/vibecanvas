import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db;
};

export type TUpdateArgs = {
  id: string;
  name?: string;
  path?: string;
};

type TCanvas = { id: string; name: string; path: string; created_at: Date };

function ctrlUpdateCanvas(portal: TPortal, args: TUpdateArgs): TErrTuple<TCanvas> {
  try {
    const updateData: Partial<typeof schema.canvas.$inferInsert> = {};

    if (args.name !== undefined) updateData.name = args.name;
    if (args.path !== undefined) updateData.path = args.path;

    const result = portal.db
      .update(schema.canvas)
      .set(updateData)
      .where(eq(schema.canvas.id, args.id))
      .returning()
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.CANVAS.UPDATE_CANVAS.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Canvas not found" }
      }];
    }

    return [result[0], null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.CANVAS.UPDATE_CANVAS.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to update canvas" }
    }];
  }
}

export default ctrlUpdateCanvas;
