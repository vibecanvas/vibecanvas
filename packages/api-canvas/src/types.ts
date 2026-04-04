import type { IDbService } from '@vibecanvas/db/IDbService';

type TCanvasApiContext = {
  db: IDbService;
  requestId?: string;
};

export type { TCanvasApiContext };
