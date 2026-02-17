import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"

export type TPortal = {
  db: typeof db;
};

export type TArgs = {
  id: string;
  canvas_id: string;
  title: string;
  path: string;
  locked?: boolean;
  glob_pattern?: string | null;
};

type TFiletree = typeof schema.filetrees.$inferSelect;

export function ctrlCreateFiletree(portal: TPortal, args: TArgs): TErrTuple<TFiletree> {
  try {
    const filetree = {
      id: args.id,
      canvas_id: args.canvas_id,
      path: args.path,
      title: args.title,
      locked: args.locked ?? false,
      glob_pattern: args.glob_pattern ?? null,
    } as const;
    const result = portal.db.insert(schema.filetrees).values(filetree).returning().all();
    return [result[0] as TFiletree, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.FILETREE.CREATE_FILETREE.FAILED", statusCode: 500, externalMessage: { en: "Failed to create filetree" } }];
  }
}
