import { implement } from '@orpc/server';
import { filetreeContract } from './contract';
import type { TFiletreeApiContext } from './types';

const baseFiletreeOs = implement(filetreeContract)
  .$context<TFiletreeApiContext>();

export { baseFiletreeOs };
