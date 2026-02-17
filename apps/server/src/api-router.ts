import { agentLogs } from './apis/api.agent-logs';
import { ai } from './apis/api.ai';
import { canvas } from './apis/api.canvas';
import { chat } from './apis/api.chat';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filetree } from './apis/api.filetree';
import { notification } from './apis/api.notification';

export const router = {
  api: {
    canvas,
    chat,
    file,
    filetree,
    "agent-logs": agentLogs,
    ai,
    db,
    notification,
  }
}
