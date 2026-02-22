import type { AssistantMessage, Event as OpenCodeEvent, Part } from "@opencode-ai/sdk/v2";
import { eventIterator, oc, type } from "@orpc/contract";
import { z } from "zod";

const filePartSourceTextSchema = z.object({
  value: z.string(),
  start: z.number(),
  end: z.number(),
});

const filePartSourceSchema = z.discriminatedUnion('type', [
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal('file'),
    path: z.string(),
  }),
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal('symbol'),
    path: z.string(),
    range: z.object({
      start: z.object({ line: z.number(), character: z.number() }),
      end: z.object({ line: z.number(), character: z.number() }),
    }),
    name: z.string(),
    kind: z.number(),
  }),
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal('resource'),
    clientName: z.string(),
    uri: z.string(),
  }),
]);

const promptInputSchema = z.object({
  chatId: z.string(),
  parts: z.array(z.discriminatedUnion('type', [
    z.object({
      id: z.string().optional(),
      type: z.literal('text'),
      text: z.string(),
      synthetic: z.boolean().optional(),
      ignored: z.boolean().optional(),
      time: z.object({
        start: z.number(),
        end: z.number().optional(),
      }).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal('file'),
      mime: z.string(),
      filename: z.string().optional(),
      url: z.string(),
      source: filePartSourceSchema.optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal('agent'),
      name: z.string(),
      source: z.object({
        value: z.string(),
        start: z.number(),
        end: z.number(),
      }).optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal('subtask'),
      prompt: z.string(),
      description: z.string(),
      agent: z.string(),
      model: z.object({
        providerID: z.string(),
        modelID: z.string(),
      }).optional(),
      command: z.string().optional(),
    }),
  ])),
})

export default oc.router({

  prompt: oc
    .input(promptInputSchema)
    .output(type<{ info: AssistantMessage; parts: Array<Part>; }>()),

  events: oc
    .input(z.object({ chatId: z.string() }))
    .output(eventIterator(type<OpenCodeEvent>()))

});
