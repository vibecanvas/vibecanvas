import type { IPtyService } from '@vibecanvas/pty-service/IPtyService';

type TPtyApiContext = {
  pty: IPtyService;
  requestId?: string;
};

export type { TPtyApiContext };
