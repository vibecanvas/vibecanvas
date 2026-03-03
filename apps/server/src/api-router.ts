import { canvas } from './apis/api.canvas';
import { chat } from './apis/api.chat';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filesystem } from './apis/api.filesystem';
import { filetree } from './apis/api.filetree';
import { lsp } from './apis/api.lsp';
import { notification } from './apis/api.notification';
import { opencode } from './apis/api.opencode';

export const router = {
  api: {
    canvas,
    chat,
    file,
    filesystem,
    filetree,
    lsp,
    opencode,
    db,
    notification,
  }
}
