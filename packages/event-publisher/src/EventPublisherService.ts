import { EventPublisher } from '@orpc/server';
import type { IEventPublisherService, TDbEvent, TNotificationEvent } from './IEventPublisherService';

export class EventPublisherService implements IEventPublisherService {
  readonly name = 'eventPublisher';

  #db = new EventPublisher<Record<string, TDbEvent>>();
  #notification = new EventPublisher<Record<string, TNotificationEvent>>();
  #latestNotification: TNotificationEvent | null = null;

  publishDbEvent(canvasId: string, event: TDbEvent): void {
    this.#db.publish(canvasId, event);
  }

  subscribeDbEvents(canvasId: string): AsyncIterable<TDbEvent> {
    return this.#db.subscribe(canvasId);
  }

  publishNotification(event: TNotificationEvent): void {
    this.#latestNotification = event;
    this.#notification.publish('global', event);
  }

  subscribeNotifications(): AsyncIterable<TNotificationEvent> {
    return this.#notification.subscribe('global');
  }

  getLatestNotification(): TNotificationEvent | null {
    return this.#latestNotification;
  }
}
