import { ctrlCreateFiletree, ctrlDeleteFiletree, ctrlUpdateFiletree } from "@vibecanvas/core/filetree/index";
import { tExternal } from "@vibecanvas/server/error-fn";
import { baseOs } from "../orpc.base";
import type * as _DrizzleZod from "drizzle-zod";

const create = baseOs.api.filetree.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlCreateFiletree({ db }, {
    canvas_id: input.canvas_id,
    title: input.title,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    is_collapsed: input.is_collapsed,
    glob_pattern: input.glob_pattern,
  });

  if (error || !result) {
    throw new Error(tExternal(error));
  }

  const filetree = db.query.filetrees.findFirst({ where: (table, { eq }) => eq(table.id, result.id) }).sync();
  if (!filetree) {
    throw new Error("Filetree not found after creation");
  }

  return filetree;
});

const update = baseOs.api.filetree.update.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlUpdateFiletree({ db }, {
    filetreeId: input.params.id,
    ...input.body,
  });

  if (error) {
    throw new Error(tExternal(error));
  }

  const filetree = db.query.filetrees.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync();
  if (!filetree) {
    throw new Error("Filetree not found");
  }

  return filetree;
});

const remove = baseOs.api.filetree.remove.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlDeleteFiletree({ db }, { filetreeId: input.params.id });
  if (error) {
    throw new Error(tExternal(error));
  }
});

export const filetree: any = {
  create,
  update,
  remove,
};
