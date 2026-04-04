import { oc, populateContractRouterPaths } from '@orpc/contract';
import { implement, onError } from '@orpc/server';
import { canvasContract } from '@vibecanvas/api-canvas/contract';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { fileContract } from '@vibecanvas/api-file/contract';

const contract = oc.router({
  canvas: canvasContract,
  file: fileContract,
});

const apiContract = populateContractRouterPaths(
  oc.router({ api: contract }),
);

const baseOs = implement(apiContract)
  .$context<{ db: IDbService; requestId?: string }>()
  .use(onError((error) => {
    console.error(error);
  }));

export { apiContract, baseOs, contract };
