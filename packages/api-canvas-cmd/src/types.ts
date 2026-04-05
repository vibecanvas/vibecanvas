import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';

type TCanvasCmdApiContext = {
  db: IDbService;
  automerge: IAutomergeService;
  requestId?: string;
};

export type { TCanvasCmdApiContext };
