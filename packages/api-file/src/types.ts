import type { IDbService } from '@vibecanvas/db/IDbService';

type TFileApiContext = {
  db: IDbService;
  requestId?: string;
};

export type { TFileApiContext };
