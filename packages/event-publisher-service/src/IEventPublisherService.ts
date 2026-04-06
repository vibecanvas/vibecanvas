import type { IService } from '@vibecanvas/runtime';
import type { ZDbEventSchema } from '@vibecanvas/api-db/contract';
import type { ZNotificationEvent } from '@vibecanvas/api-notification/contract';
import type { z } from 'zod';

export type TDbEvent = z.infer<typeof ZDbEventSchema>;
export type TNotificationEvent = z.infer<typeof ZNotificationEvent>;
export type TFilesystemEvent = {
  eventType: 'rename' | 'change';
  fileName: string;
};

export interface IEventPublisherService extends IService {
  publishDbEvent(canvasId: string, event: TDbEvent): void;
  subscribeDbEvents(canvasId: string): AsyncIterable<TDbEvent>;

  publishFilesystemEvent(path: string, event: TFilesystemEvent): void;
  subscribeFilesystemEvents(path: string): AsyncIterable<TFilesystemEvent>;

  publishNotification(event: TNotificationEvent): void;
  subscribeNotifications(): AsyncIterable<TNotificationEvent>;
  getLatestNotification(): TNotificationEvent | null;
}
