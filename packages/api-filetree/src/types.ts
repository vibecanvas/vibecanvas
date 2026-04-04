import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher/IEventPublisherService';

type TFiletreeApiContext = {
  db: IDbService;
  eventPublisher: IEventPublisherService;
  automerge: IAutomergeService;
  requestId?: string;
};

export type { TFiletreeApiContext };
