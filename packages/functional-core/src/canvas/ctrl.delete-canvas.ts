import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db;
};

export type TDeleteArgs = {
  id: string;
};

type TDeleteResult = {
  id: string;
  deleted: boolean;
};

export function ctrlDeleteCanvas(portal: TPortal, args: TDeleteArgs): TErrTuple<TDeleteResult> {
  try {
    const result = portal.db
      .delete(schema.canvas)
      .where(eq(schema.canvas.id, args.id))
      .returning({ id: schema.canvas.id })
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.CANVAS.DELETE_CANVAS.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Canvas not found" }
      }];
    }

    return [{ id: result[0].id, deleted: true }, null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.CANVAS.DELETE_CANVAS.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to delete canvas" }
    }];
  }
}