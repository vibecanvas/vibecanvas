import { oc } from "@orpc/contract";
import { ZChatsSelect } from "@vibecanvas/shell/database/schema";
import { z } from "zod";

const createChatInputSchema = z.object({
  canvas_id: z.string(),
  title: z.string(),
  local_path: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
});

const updateChatBodySchema = z.object({
  title: z.string().optional(),
});

export type TChat = z.infer<typeof ZChatsSelect>;
export type TCreateChatInput = z.infer<typeof createChatInputSchema>;
export type TUpdateChatInput = z.infer<typeof updateChatBodySchema>;

export default oc.router({
  list: oc
    .output(z.array(ZChatsSelect)),

  create: oc
    .input(createChatInputSchema)
    .output(ZChatsSelect),

  update: oc
    .input(z.object({ params: z.object({ id: z.string() }), body: updateChatBodySchema }))
    .output(ZChatsSelect),

  newSession: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(ZChatsSelect),

  remove: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(z.void()),
});
