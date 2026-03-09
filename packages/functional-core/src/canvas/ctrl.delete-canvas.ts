import type { AutomergeUrl, Repo } from "@automerge/automerge-repo";
import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db,
  repo: Repo
};

export type TDeleteArgs = {
  id: string;
};

export type TCanvas = typeof schema.canvas.$inferSelect;


export function ctrlDeleteCanvas(portal: TPortal, args: TDeleteArgs): TErrTuple<TCanvas> {
  try {
    const result = portal.db
      .delete(schema.canvas)
      .where(eq(schema.canvas.id, args.id))
      .returning()
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.CANVAS.DELETE_CANVAS.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Canvas not found" }
      }];
    }

    portal.repo.delete(result[0].automerge_url as AutomergeUrl)

    return [result[0], null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.CANVAS.DELETE_CANVAS.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to delete canvas" }
    }];
  }
}