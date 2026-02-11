import { oc } from "@orpc/contract";
import { ZCanvasSelect, ZChatsSelect, ZFileTreeSelect } from "@vibecanvas/shell/database/schema";
import { z } from "zod";

const getCanvasByIdResponseSchema = z.object({
  chats: ZChatsSelect.array(),
  canvas: ZCanvasSelect.array(),
  fileTrees: ZFileTreeSelect.array(),
});

const createCanvasInputSchema = z.object({
  name: z.string(),
  path: z.string(),
  automerge_url: z.string(),
});

const updateCanvasInputSchema = z.object({
  name: z.string().optional(),
  path: z.string().optional(),
});

export default oc.router({
  list: oc
    .output(ZCanvasSelect.array()),

  get: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(getCanvasByIdResponseSchema),

  create: oc
    .input(createCanvasInputSchema)
    .output(ZCanvasSelect),

  update: oc
    .input(z.object({ params: z.object({ id: z.string() }), body: updateCanvasInputSchema }))
    .output(ZCanvasSelect),

  remove: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(z.void()),
});
