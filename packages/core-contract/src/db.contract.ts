import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod";

export const ZDbEventSchema = z.object({
  data: z.object({
    change: z.union([z.literal('insert'), z.literal('update'), z.literal('delete')]),
    table: z.string(),
    id: z.string(),
    record: z.record(z.any(), z.any())
  })
});

export default oc.router({
  events: oc
    .input(z.object({canvasId: z.string()}))
    .output(eventIterator(ZDbEventSchema)),
});
