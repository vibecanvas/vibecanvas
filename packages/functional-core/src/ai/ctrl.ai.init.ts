import type { ClaudeAgent } from "@vibecanvas/shell/claude-agent/srv.claude-agent";
import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { eq } from "drizzle-orm";


type TPortal = {
  db: typeof db;
  ClaudeAgent: typeof ClaudeAgent;
};

type TArgs = {
  chatId: string;
  canvasId: string;
  harness: typeof schema.chats.$inferSelect.harness
};

type TReturn = {
  chat: typeof schema.chats.$inferSelect
}


/**
 * Checks db, creates new chat if not exists
 */
export default function ctrlAiInit(portal: TPortal, args: TArgs): TErrTuple<TReturn> {

  const chat = portal.db.query.chats.findFirst({ where: eq(schema.chats.id, args.chatId) }).sync()
  if (chat) return [{ chat }, null]

  const newChatData: typeof schema.chats.$inferInsert = {
    id: args.chatId,
    canvas_id: args.canvasId,
    harness: args.harness,
    title: "New Chat"
  }

  const newChat =  portal.db.insert(schema.chats).values(newChatData).returning().all();

  return [{ chat: newChat[0] }, null]
}
