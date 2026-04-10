import type { IPtyService } from '@vibecanvas/service-pty/IPtyService';

type TPtyApiContext = {
  pty: IPtyService;
  requestId?: string;
};

export type { TPtyApiContext };
