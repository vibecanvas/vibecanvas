import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher-service/IEventPublisherService';

type TCanvasCmdApiContext = {
  db: IDbService;
  eventPublisher: IEventPublisherService;
  automerge: IAutomergeService;
  requestId?: string;
};

export type { TCanvasCmdApiContext };
