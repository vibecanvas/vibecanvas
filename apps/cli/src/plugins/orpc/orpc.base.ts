import { oc, populateContractRouterPaths } from '@orpc/contract';
import { implement, onError } from '@orpc/server';
import { canvasContract } from '@vibecanvas/api-canvas/contract';
import { fileContract } from '@vibecanvas/api-file/contract';
import { notificationContract } from '@vibecanvas/api-notification/contract';
import { ptyContract } from '@vibecanvas/api-pty/contract';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher/IEventPublisherService';
import type { IPtyService } from '@vibecanvas/pty-service/IPtyService';

const contract = oc.router({
  canvas: canvasContract,
  file: fileContract,
  notification: notificationContract,
  pty: ptyContract,
});

const apiContract = populateContractRouterPaths(
  oc.router({ api: contract }),
);

const baseOs = implement(apiContract)
  .$context<{ db: IDbService; eventPublisher: IEventPublisherService; pty: IPtyService; requestId?: string }>()
  .use(onError((error) => {
    console.error(error);
  }));

export { apiContract, baseOs, contract };
