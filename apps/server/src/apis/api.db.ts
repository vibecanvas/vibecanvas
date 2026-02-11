import { EventPublisher } from "@orpc/server";
import { ZDbEventSchema } from "@vibecanvas/core-contract/db.contract.ts";
import * as z from "zod";
import { baseOs } from "../orpc.base";

export type TDbEvent = z.infer<typeof ZDbEventSchema>;
export const dbUpdatePublisher = new EventPublisher<Record<string, TDbEvent>>()

const events = baseOs.api.db.events.handler(async function* ({ input, context: { db } }) {
  for await (const event of dbUpdatePublisher.subscribe(input.canvasId)) {
    yield event;
  }
})

export const db = {
  events
}
