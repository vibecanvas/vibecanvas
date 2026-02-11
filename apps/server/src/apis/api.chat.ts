import { ctrlCreateChat } from "@vibecanvas/core/chat/index";
import ctrlDeleteChat from "@vibecanvas/core/chat/ctrl.delete-chat";
import ctrlUpdateChat from "@vibecanvas/core/chat/ctrl.update-chat";
import { ClaudeAgent } from "@vibecanvas/shell/claude-agent/srv.claude-agent";
import { tExternal } from "@vibecanvas/server/error-fn";
import { baseOs } from "../orpc.base";
import type * as _DrizzleZod from "drizzle-zod";
import { dbUpdatePublisher } from "./api.db";

const list = baseOs.api.chat.list.handler(async ({ context: { db } }) => {
  return db.query.chats.findMany().sync();
});

const create = baseOs.api.chat.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlCreateChat({ db }, {
    canvas_id: input.canvas_id,
    title: input.title,
    harness: input.harness,
    local_path: input.local_path ?? null,
  });
  if (error || !result) {
    throw new Error(tExternal(error));
  }

  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, result.id) }).sync();
  if (!chat) {
    throw new Error("Chat not found after creation");
  }

  return chat;
});

const update = baseOs.api.chat.update.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlUpdateChat({ db }, { id: input.params.id, local_path: input.body.local_path, title: input.body.title });
  if (error) {
    throw new Error(tExternal(error));
  }

  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.params.id) }).sync();
  if (!chat) {
    throw new Error("Chat not found");
  }
  dbUpdatePublisher.publish(chat.canvas_id, { data: { change: 'update', id: chat.id, table: 'chats', record: chat}})

  return chat;
});

const remove = baseOs.api.chat.remove.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlDeleteChat({ db, claudeAgent: ClaudeAgent }, { id: input.params.id });
  if (error) {
    throw new Error(tExternal(error));
  }
});

export const chat = {
  list,
  create,
  update,
  remove,
};
