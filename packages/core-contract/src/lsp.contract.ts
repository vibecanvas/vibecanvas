import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod";

const lspErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
});

const lspOpenInputSchema = z.object({
  channelId: z.string(),
  filePath: z.string(),
  language: z.string().optional(),
  rootHint: z.string().optional(),
});

const lspOpenOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  lspErrorSchema,
]);

const lspSendInputSchema = z.object({
  channelId: z.string(),
  message: z.string(),
});

const lspSendOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  lspErrorSchema,
]);

const lspCloseInputSchema = z.object({
  channelId: z.string(),
});

const lspEventSchema = z.union([
  z.object({
    type: z.literal("opened"),
    channelId: z.string(),
    language: z.string(),
    projectRoot: z.string(),
  }),
  z.object({
    type: z.literal("message"),
    channelId: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    channelId: z.string(),
    message: z.string(),
  }),
]);

export type TLspOpenInput = z.infer<typeof lspOpenInputSchema>;
export type TLspSendInput = z.infer<typeof lspSendInputSchema>;
export type TLspCloseInput = z.infer<typeof lspCloseInputSchema>;
export type TLspEvent = z.infer<typeof lspEventSchema>;

export default oc.router({
  open: oc
    .input(lspOpenInputSchema)
    .output(lspOpenOutputSchema),

  send: oc
    .input(lspSendInputSchema)
    .output(lspSendOutputSchema),

  close: oc
    .input(lspCloseInputSchema)
    .output(z.object({ success: z.literal(true) })),

  events: oc
    .input(z.object({}))
    .output(eventIterator(lspEventSchema)),
});
