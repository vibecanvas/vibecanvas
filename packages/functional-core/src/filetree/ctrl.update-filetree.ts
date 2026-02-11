import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

export type TPortal = {
  db: typeof db;
};

export type TUpdateArgs = {
  filetreeId: string;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  is_collapsed?: boolean;
  glob_pattern?: string | null;
  group_ids?: string[];
  bound_ids?: string[];
};

type TFiletree = {
  id: string;
  canvas_id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_collapsed: boolean;
  glob_pattern: string | null;
  created_at: Date;
};

function ctrlUpdateFiletree(portal: TPortal, args: TUpdateArgs): TErrTuple<TFiletree> {
  try {
    const updateData: Partial<typeof schema.filetrees.$inferInsert> = {};

    if (args.title !== undefined) updateData.title = args.title;
    if (args.x !== undefined) updateData.x = args.x;
    if (args.y !== undefined) updateData.y = args.y;
    if (args.width !== undefined) updateData.width = args.width;
    if (args.height !== undefined) updateData.height = args.height;
    if (args.is_collapsed !== undefined) updateData.is_collapsed = args.is_collapsed;
    if (args.glob_pattern !== undefined) updateData.glob_pattern = args.glob_pattern;
    if (args.group_ids !== undefined) updateData.group_ids = args.group_ids;
    if (args.bound_ids !== undefined) updateData.bound_ids = args.bound_ids;

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

export default ctrlUpdateFiletree;
