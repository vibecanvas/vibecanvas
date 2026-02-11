import { oc } from "@orpc/contract";
import { ZAgentLogsSelect } from "@vibecanvas/shell/database/schema";
import { z } from "zod";
import type * as _DrizzleZod from "drizzle-zod";

const errorSchema = z.object({
  type: z.literal("ERROR"),
  message: z.literal("Failed to get agent logs"),
});

export type TAgentLog = z.infer<typeof ZAgentLogsSelect>;

export default oc.router({
  getBySession: oc
    .input(z.object({ params: z.object({ sessionId: z.string() }) }))
    .output(z.union([z.array(ZAgentLogsSelect), errorSchema])),
});
