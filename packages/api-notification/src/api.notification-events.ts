import { baseNotificationOs } from './orpc';

const apiNotificationEvents = baseNotificationOs.events.handler(async function* ({ context }) {
  const latest = context.eventPublisher.getLatestNotification();
  if (latest) {
    yield latest;
  }

  for await (const event of context.eventPublisher.subscribeNotifications()) {
    yield event;
  }
});

export { apiNotificationEvents };
