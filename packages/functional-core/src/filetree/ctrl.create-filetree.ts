import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"

type TPortal = {
  db: typeof db;
};

type TArgs = {
  canvas_id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_collapsed?: boolean;
  glob_pattern?: string | null;
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

function ctrlCreateFiletree(portal: TPortal, args: TArgs): TErrTuple<TFiletree> {
  try {
    const filetree = {
      id: crypto.randomUUID(),
      canvas_id: args.canvas_id,
      title: args.title,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      is_collapsed: args.is_collapsed ?? false,
      glob_pattern: args.glob_pattern ?? null,
      created_at: new Date(),
    };
    const result = portal.db.insert(schema.filetrees).values(filetree).returning().all();
    return [result[0] as TFiletree, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.FILETREE.CREATE_FILETREE.FAILED", statusCode: 500, externalMessage: { en: "Failed to create filetree" } }];
  }
}

export default ctrlCreateFiletree;
export type { TPortal, TArgs, TFiletree };
