import { implement } from '@orpc/server';
import { apiCreatePty } from './api.create-pty';
import { apiGetPty } from './api.get-pty';
import { apiListPty } from './api.list-pty';
import { apiRemovePty } from './api.remove-pty';
import { apiUpdatePty } from './api.update-pty';
import { ptyContract } from './contract';
import type { TPtyApiContext } from './types';

const basePtyOs = implement(ptyContract)
  .$context<TPtyApiContext>();

const ptyHandlers = {
  list: basePtyOs.list.handler(apiListPty),
  create: basePtyOs.create.handler(apiCreatePty),
  get: basePtyOs.get.handler(apiGetPty),
  update: basePtyOs.update.handler(apiUpdatePty),
  remove: basePtyOs.remove.handler(apiRemovePty),
};

export { basePtyOs, ptyHandlers };
