import { EventPublisher } from "@orpc/server";
import { baseOs } from "../orpc.base";
import { ZNotificationEvent } from "@vibecanvas/core-contract";
import { z } from "zod";

type TNotificationEvent = z.infer<typeof ZNotificationEvent>;

export const notificationPublisher = new EventPublisher<Record<string, TNotificationEvent>>();
let latestGlobalNotification: TNotificationEvent | null = null;

const events = baseOs.api.notification.events.handler(async function* () {
  if (latestGlobalNotification) {
    yield latestGlobalNotification;
  }

  for await (const event of notificationPublisher.subscribe("global")) {
    yield event;
  }
});

export const notification = { events };

export function publishNotification(event: TNotificationEvent) {
  latestGlobalNotification = event;
  notificationPublisher.publish("global", event);
}
