import { ctrlCreateCanvas } from "@vibecanvas/core/canvas/ctrl.create-canvas";
import { ctrlDeleteCanvas } from "@vibecanvas/core/canvas/ctrl.delete-canvas";
import { ctrlGetFullCanvas } from "@vibecanvas/core/canvas/ctrl.get-full-canvas";
import { ctrlUpdateCanvas } from "@vibecanvas/core/canvas/ctrl.update-canvas";
import { ORPCError } from "@orpc/server";
import { baseOs } from "../orpc.base";

const list = baseOs.api.canvas.list.handler(async ({ context: { db } }) => {
  return db.query.canvas.findMany().sync()
})

const get = baseOs.api.canvas.get.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlGetFullCanvas({ db }, { id: input.params.id })
  if (error) {
    throw error
  }

  return {
    chats: result.chats,
    canvas: [result.canvas],
    fileTrees: result.fileTrees,
  }
})

const create = baseOs.api.canvas.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlCreateCanvas({ db }, {
    name: input.name,
    automerge_url: input.automerge_url,
  })

  if (error) {
    throw error
  }

  return result
})

const update = baseOs.api.canvas.update.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlUpdateCanvas({ db }, { id: input.params.id, ...input.body })

  if (error) {
    throw error
  }

  const canvas = db.query.canvas.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync()
  if (!canvas) {
    throw new ORPCError("NOT_FOUND", { message: "Canvas not found" })
  }

  return canvas
})

const remove = baseOs.api.canvas.remove.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlDeleteCanvas({ db }, { id: input.params.id })
  if (error) {
    throw error
  }
})

export const canvas = {
  list,
  get,
  create,
  update,
  remove,
}
