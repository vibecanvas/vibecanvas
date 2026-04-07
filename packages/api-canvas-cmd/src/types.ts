import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { IDbService } from '@vibecanvas/service-db/IDbService';

type TCanvasCmdApiContext = {
  db: IDbService;
  automerge: IAutomergeService;
  requestId?: string;
};

export type { TCanvasCmdApiContext };
