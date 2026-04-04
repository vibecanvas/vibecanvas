import { implement } from '@orpc/server';
import { apiNotificationEvents } from './api.notification-events';
import { notificationContract } from './contract';
import type { TNotificationApiContext } from './types';

const baseNotificationOs = implement(notificationContract)
  .$context<TNotificationApiContext>();

const notificationHandlers = {
  events: baseNotificationOs.events.handler(apiNotificationEvents),
};

export { baseNotificationOs, notificationHandlers };
