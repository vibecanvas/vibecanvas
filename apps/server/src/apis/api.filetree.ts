import { ORPCError } from "@orpc/contract";
import { ctrlCreateFiletree } from "@vibecanvas/core/filetree/ctrl.create-filetree";
import { ctrlDeleteFiletree } from "@vibecanvas/core/filetree/ctrl.delete-filetree";
import { ctrlUpdateFiletree } from "@vibecanvas/core/filetree/ctrl.update-filetree";
import { repo } from "@vibecanvas/server/automerge-repo";
import { tExternal } from "@vibecanvas/server/error-fn";
import { baseOs } from "../orpc.base";
import { dbUpdatePublisher } from "./api.db";

const create = baseOs.api.filetree.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = await ctrlCreateFiletree({ db, repo }, {
    canvas_id: input.canvas_id,
    title: 'File Tree',
    path: input.path || '',
    x: input.x,
    y: input.y,
    locked: false,
    glob_pattern: null,
  });

  if (error || !result) {
    throw new ORPCError(error.code, { message: tExternal(error) })
  }

  const filetree = db.query.filetrees.findFirst({ where: (table, { eq }) => eq(table.id, result.id) }).sync();
  if (!filetree) {
    throw new ORPCError('NOT_FOUND', { message: 'Filetree not found after creation' })
  }

  dbUpdatePublisher.publish(filetree.canvas_id, {
    data: { change: 'insert', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
});

const update = baseOs.api.filetree.update.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlUpdateFiletree({ db }, {
    filetreeId: input.params.id,
    ...input.body,
  });

  if (error) {
    throw new ORPCError(error.code, { message: tExternal(error) })
  }

  const filetree = db.query.filetrees.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync();
  if (!filetree) {
    throw new ORPCError('NOT_FOUND', { message: 'Filetree not found' })
  }

  dbUpdatePublisher.publish(filetree.canvas_id, {
    data: { change: 'update', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
});

const remove = baseOs.api.filetree.remove.handler(async ({ input, context: { db } }) => {
  const filetree = db.query.filetrees.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync();
  const [, error] = ctrlDeleteFiletree({ db }, { filetreeId: input.params.id });
  if (error && error.code !== "CTRL.FILETREE.DELETE_FILETREE.NOT_FOUND") {
    throw new ORPCError(error.code, { message: tExternal(error) })
  }

  if (filetree) {
    dbUpdatePublisher.publish(filetree.canvas_id, {
      data: { change: 'delete', id: filetree.id, table: 'filetrees' },
    });
  }
});

export const filetree = {
  create,
  update,
  remove,
};
