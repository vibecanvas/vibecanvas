import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db;
};

export type TDeleteArgs = {
  filetreeId: string;
};

type TDeleteResult = {
  id: string;
  deleted: boolean;
};

function ctrlDeleteFiletree(portal: TPortal, args: TDeleteArgs): TErrTuple<TDeleteResult> {
  try {
    const result = portal.db
      .delete(schema.filetrees)
      .where(eq(schema.filetrees.id, args.filetreeId))
      .returning({ id: schema.filetrees.id })
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.FILETREE.DELETE_FILETREE.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Filetree not found" }
      }];
    }

    return [{ id: result[0].id, deleted: true }, null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.FILETREE.DELETE_FILETREE.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to delete filetree" }
    }];
  }
}

export default ctrlDeleteFiletree;
