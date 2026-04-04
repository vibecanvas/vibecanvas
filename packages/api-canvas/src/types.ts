import type { IDbService } from '@vibecanvas/db/IDbService';

type TCanvasApiContext = {
  db: IDbService;
  repo?: unknown;
  requestId?: string;
};

export type { TCanvasApiContext };
