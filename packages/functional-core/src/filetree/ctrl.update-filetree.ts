import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db;
};

export type TUpdateArgs = {
  filetreeId: string;
  title?: string;
  path?: string;
  locked?: boolean;
  glob_pattern?: string | null;
};

type TFiletree = typeof schema.filetrees.$inferSelect;

export function ctrlUpdateFiletree(portal: TPortal, args: TUpdateArgs): TErrTuple<TFiletree> {
  try {
    const updateData: Partial<typeof schema.filetrees.$inferInsert> = {};

    if (args.title !== undefined) updateData.title = args.title;
    if (args.path !== undefined) updateData.path = args.path;
    if (args.locked !== undefined) updateData.locked = args.locked;
    if (args.glob_pattern !== undefined) updateData.glob_pattern = args.glob_pattern;
    updateData.updated_at = new Date();

    const result = portal.db
      .update(schema.filetrees)
      .set(updateData)
      .where(eq(schema.filetrees.id, args.filetreeId))
      .returning()
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.FILETREE.UPDATE_FILETREE.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Filetree not found" }
      }];
    }

    return [result[0] as TFiletree, null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.FILETREE.UPDATE_FILETREE.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to update filetree" }
    }];
  }
}