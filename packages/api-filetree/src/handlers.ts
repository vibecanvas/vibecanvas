import { implement } from '@orpc/server';
import { apiCreateFiletree } from './api.create-filetree';
import { apiRemoveFiletree } from './api.remove-filetree';
import { apiUpdateFiletree } from './api.update-filetree';
import { filetreeContract } from './contract';
import type { TFiletreeApiContext } from './types';

const baseFiletreeOs = implement(filetreeContract)
  .$context<TFiletreeApiContext>();

const filetreeHandlers = {
  create: baseFiletreeOs.create.handler(apiCreateFiletree),
  update: baseFiletreeOs.update.handler(apiUpdateFiletree),
  remove: baseFiletreeOs.remove.handler(apiRemoveFiletree),
};

export { baseFiletreeOs, filetreeHandlers };
