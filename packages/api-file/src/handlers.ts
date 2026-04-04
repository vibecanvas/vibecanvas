import { implement } from '@orpc/server';
import { apiCloneFile } from './api.clone-file';
import { apiPutFile } from './api.put-file';
import { apiRemoveFile } from './api.remove-file';
import { fileContract } from './contract';
import type { TFileApiContext } from './types';

const baseFileOs = implement(fileContract)
  .$context<TFileApiContext>();

const fileHandlers = {
  put: baseFileOs.put.handler(apiPutFile),
  clone: baseFileOs.clone.handler(apiCloneFile),
  remove: baseFileOs.remove.handler(apiRemoveFile),
};

export { baseFileOs, fileHandlers };
