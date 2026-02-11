import * as schema from "@vibecanvas/shell/database/schema";
import { eq } from "drizzle-orm";
import { baseOs } from "../orpc.base";
import type * as _DrizzleZod from "drizzle-zod";

const getBySession = baseOs.api["agent-logs"].getBySession.handler(async ({ input, context: { db } }) => {
  try {
    return db.query.agent_logs.findMany({ where: eq(schema.agent_logs.session_id, input.params.sessionId) }).sync();
  } catch {
    return { type: "ERROR", message: "Failed to get agent logs" };
  }
});

export const agentLogs = {
  getBySession,
};
