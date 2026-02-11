import { ctrlGetFullCanvas } from "@vibecanvas/core/canvas/ctrl.get-full-canvas";
import { ctrlCreateCanvas, ctrlDeleteCanvas, ctrlUpdateCanvas } from "@vibecanvas/core/canvas/index";
import { tExternal } from "@vibecanvas/server/error-fn";
import { baseOs } from "../orpc.base";

const list = baseOs.api.canvas.list.handler(async ({ context: { db }}) => {
  return db.query.canvas.findMany().sync()
})

const get = baseOs.api.canvas.get.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlGetFullCanvas({ db }, { id: input.params.id })
  if (error) {
    const eMsg = tExternal(error)
    throw new Error(eMsg)
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
    const eMsg = tExternal(error)
    throw new Error(eMsg)
  }

  return result
})

const update = baseOs.api.canvas.update.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlUpdateCanvas({ db }, { id: input.params.id, ...input.body })

  if (error) {
    const eMsg = tExternal(error)
    throw new Error(eMsg)
  }

  const canvas = db.query.canvas.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync()
  if (!canvas) {
    throw new Error("Canvas not found")
  }

  return canvas
})

const remove = baseOs.api.canvas.remove.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlDeleteCanvas({ db }, { id: input.params.id })
  if (error) {
    const eMsg = tExternal(error)
    throw new Error(eMsg)
  }
})

export const canvas = {
  list,
  get,
  create,
  update,
  remove,
}
