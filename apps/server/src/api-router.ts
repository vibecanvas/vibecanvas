import { agentLogs } from './apis/api.agent-logs';
import { ai } from './apis/api.ai';
import { canvas } from './apis/api.canvas';
import { chat } from './apis/api.chat';
import { db } from './apis/api.db';
import { file } from './apis/api.file';
import { filetree } from './apis/api.filetree';
import { project } from './apis/api.project';

export const router = {
  api: {
    canvas,
    chat,
    file,
    filetree,
    project,
    "agent-logs": agentLogs,
    ai,
    db
  }
}
