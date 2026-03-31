import { canvas } from './apis/api.canvas';
import { chat } from './apis/api.chat';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filesystem } from './apis/api.filesystem';
import { filetree } from './apis/api.filetree';
import { notification } from './apis/api.notification';
import { opencode } from './apis/api.opencode';
import { pty } from './apis/api.pty';

export const router = {
  api: {
    canvas,
    chat,
    file,
    filesystem,
    filetree,
    opencode,
    pty,
    db,
    notification,
  }
}
