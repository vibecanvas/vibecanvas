import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { homedir } from 'os';

type TPortal = {
  db: typeof db;
};

type TArgs = Pick<TChat, 'canvas_id' | 'title' | 'harness' | 'local_path'>;

type TChat = typeof schema.chats.$inferSelect;

export function ctrlCreateChat(portal: TPortal, args: TArgs): TErrTuple<TChat> {
  try {

    const chat: typeof schema.chats.$inferInsert = {
      id: crypto.randomUUID(),
      canvas_id: args.canvas_id,
      title: args.title,
      harness: args.harness,
      local_path: args.local_path ?? homedir(),
    };
    const result = portal.db.insert(schema.chats).values(chat).returning().all();
    return [result[0] as TChat, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.CHAT.CREATE_CHAT.FAILED", statusCode: 500, externalMessage: { en: "Failed to create chat" } }];
  }
}