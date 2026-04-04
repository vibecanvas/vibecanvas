import { implement } from '@orpc/server';
import { canvasCmdApiContract } from './contract';
import type { TCanvasCmdApiContext } from './types';

const baseCanvasCmdOs = implement(canvasCmdApiContract)
  .$context<TCanvasCmdApiContext>();

export { baseCanvasCmdOs };
