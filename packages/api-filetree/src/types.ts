import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher/IEventPublisherService';

type TFiletreeApiContext = {
  db: IDbService;
  eventPublisher: IEventPublisherService;
  requestId?: string;
};

export type { TFiletreeApiContext };
