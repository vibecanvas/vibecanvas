import { implement } from '@orpc/server';
import { canvasContract } from './contract';
import { canvasImplementation } from './implementation';
import type { TCanvasApiContext } from './types';

const baseCanvasOs = implement(canvasContract)
  .$context<TCanvasApiContext>();

const canvasHandlers = {
  list: baseCanvasOs.list.handler(canvasImplementation.list),
  get: baseCanvasOs.get.handler(canvasImplementation.get),
  create: baseCanvasOs.create.handler(canvasImplementation.create),
  update: baseCanvasOs.update.handler(canvasImplementation.update),
  remove: baseCanvasOs.remove.handler(canvasImplementation.remove),
};

export { baseCanvasOs, canvasHandlers };
