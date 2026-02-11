import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { eventIterator, oc, type } from "@orpc/contract";
import { ZChatsSelect } from "@vibecanvas/shell/database/schema";
import { z } from "zod";

const initInputSchema = z.object({
  chatId: z.string(),
  canvasId: z.string(),
  harness: z.literal("CLAUDE_CODE")
});

const promptInputSchema = z.object({
  chatId: z.string(),
  data: z.array(z.discriminatedUnion('type', [
    z.object({
      type: z.literal('image'),
      source: z.discriminatedUnion('type', [
        z.object({
          type: z.literal('url'),
          url: z.string(),
        }),
        z.object({
          type: z.literal('base64'),
          data: z.string(),
          media_type: z.union([
            z.literal('image/jpeg'),
            z.literal('image/png'),
            z.literal('image/gif'),
            z.literal('image/webp')
          ]),
        }),
      ]),
    }),
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
  ])),
})

export default oc.router({
  init: oc
    .input(initInputSchema)
    .output(ZChatsSelect),

  prompt: oc
    .input(promptInputSchema)
    .output(type<SDKResultMessage>()),

  events: oc
    .input(z.object({chatId: z.string()}))
    .output(eventIterator(type<SDKMessage>()))

});
