import { implement } from '@orpc/server';
import { apiCreateCanvas } from './api.create-canvas';
import { apiGetCanvas } from './api.get-canvas';
import { apiListCanvas } from './api.list-canvas';
import { apiRemoveCanvas } from './api.remove-canvas';
import { apiUpdateCanvas } from './api.update-canvas';
import { canvasContract } from './contract';
import type { TCanvasApiContext } from './types';

const baseCanvasOs = implement(canvasContract)
  .$context<TCanvasApiContext>();

const canvasHandlers = {
  list: baseCanvasOs.list.handler(apiListCanvas),
  get: baseCanvasOs.get.handler(apiGetCanvas),
  create: baseCanvasOs.create.handler(apiCreateCanvas),
  update: baseCanvasOs.update.handler(apiUpdateCanvas),
  remove: baseCanvasOs.remove.handler(apiRemoveCanvas),
};

export { baseCanvasOs, canvasHandlers };
