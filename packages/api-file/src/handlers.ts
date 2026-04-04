import { implement } from '@orpc/server';
import { fileContract } from './contract';
import { fileImplementation } from './implementation';
import type { TFileApiContext } from './types';

const baseFileOs = implement(fileContract)
  .$context<TFileApiContext>();

const fileHandlers = {
  put: baseFileOs.put.handler(fileImplementation.put),
  clone: baseFileOs.clone.handler(fileImplementation.clone),
  remove: baseFileOs.remove.handler(fileImplementation.remove),
};

export { baseFileOs, fileHandlers };
