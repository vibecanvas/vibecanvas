import { canvas } from './apis/api.canvas';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filesystem } from './apis/api.filesystem';
import { filetree } from './apis/api.filetree';
import { notification } from './apis/api.notification';
import { pty } from './apis/api.pty';

export const router = {
  api: {
    canvas,
    file,
    filesystem,
    filetree,
    pty,
    db,
    notification,
  }
}
