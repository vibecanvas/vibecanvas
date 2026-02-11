import type { ClaudeAgent } from "@vibecanvas/shell/claude-agent/srv.claude-agent";
import type db from "@vibecanvas/shell/database/db"
import * as schema from "@vibecanvas/shell/database/schema"
import { eq } from "drizzle-orm";

type TPortal = {
  db: typeof db;
  claudeAgent: typeof ClaudeAgent;
};

type TArgs = {
  id: string;
};

function ctrlDeleteChat(portal: TPortal, args: TArgs): TErrTuple<boolean> {
  try {

    const result = portal.db.delete(schema.chats).where(eq(schema.chats.id, args.id)).returning().all()
    const deletedChat = result.at(0)
    if (!deletedChat) return [false, null];
    if(deletedChat.session_id) {
      const agent = portal.claudeAgent.instances.get(deletedChat.session_id)
      if(agent) agent[Symbol.dispose]()
    }

    return [true, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.CHAT.DELETE_CHAT.FAILED", statusCode: 500, externalMessage: { en: "Failed to delete chat" } }];
  }
}

export default ctrlDeleteChat;
export type { TPortal, TArgs };
