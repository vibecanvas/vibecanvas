import { agentLogs } from './apis/api.agent-logs';
import { canvas } from './apis/api.canvas';
import { chat } from './apis/api.chat';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filetree } from './apis/api.filetree';
import { notification } from './apis/api.notification';
import { opencode } from './apis/api.opencode';

export const router = {
  api: {
    canvas,
    chat,
    file,
    filetree,
    "agent-logs": agentLogs,
    opencode,
    db,
    notification,
  }
}
