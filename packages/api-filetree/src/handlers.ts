import { apiCreateFiletree } from './api.create-filetree';
import { apiRemoveFiletree } from './api.remove-filetree';
import { apiUpdateFiletree } from './api.update-filetree';
import { baseFiletreeOs } from './orpc';

const filetreeHandlers = {
  create: apiCreateFiletree,
  update: apiUpdateFiletree,
  remove: apiRemoveFiletree,
};

export { baseFiletreeOs, filetreeHandlers };
