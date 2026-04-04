import type { TNotificationApiContext } from './types';

async function* apiNotificationEvents({ context }: { context: TNotificationApiContext }) {
  const latest = context.eventPublisher.getLatestNotification();
  if (latest) {
    yield latest;
  }

  for await (const event of context.eventPublisher.subscribeNotifications()) {
    yield event;
  }
}

export { apiNotificationEvents };
