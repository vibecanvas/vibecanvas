import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm"

type TPortal = {
  db: typeof db;
};

type TArgs = { id: string };

type TResult = {
  canvas: typeof schema.canvas.$inferSelect;
  chats: typeof schema.chats.$inferSelect[];
  fileTrees: typeof schema.filetrees.$inferSelect[];
};

export const ctrlGetFullCanvas = (portal: TPortal, args: TArgs): TErrTuple<TResult> => {
  const canvas = portal.db.query.canvas.findFirst({where: eq(schema.canvas.id, args.id)}).sync()
  if (!canvas) {
    return [null, { code: "CTRL.CANVAS.GET_FULL_CANVAS.NOT_FOUND", statusCode: 404, externalMessage: { en: "Canvas not found" } }];
  }
  const chats = portal.db.query.chats.findMany({where: eq(schema.chats.canvas_id, args.id)}).sync()
  const fileTrees = portal.db.query.filetrees.findMany({where: eq(schema.filetrees.canvas_id, args.id)}).sync()
  return [{
    canvas,
    chats,
    fileTrees,
  }, null];
}
