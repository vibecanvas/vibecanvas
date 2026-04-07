import type { IDbService } from '@vibecanvas/service-db/IDbService';

type TFileApiContext = {
  db: IDbService;
  requestId?: string;
};

export type { TFileApiContext };
