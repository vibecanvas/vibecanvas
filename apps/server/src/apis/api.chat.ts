import { ctrlCreateChat } from "@vibecanvas/core/chat/ctrl.create-chat";
import { ctrlDeleteChat } from "@vibecanvas/core/chat/ctrl.delete-chat";
import { ctrlNewSession } from "@vibecanvas/core/chat/ctrl.new-session";
import { repo } from "@vibecanvas/server/automerge-repo";
import { homedir } from 'os';
import { baseOs } from "../orpc.base";
import { dbUpdatePublisher } from "./api.db";

const list = baseOs.api.chat.list.handler(async ({ context: { db } }) => {
  return db.query.chats.findMany().sync();
});

const create = baseOs.api.chat.create.handler(async ({ input, context: { db, opencodeService } }) => {
  const [result, error] = await ctrlCreateChat({ db, repo, opencodeService }, {
    canvas_id: input.canvas_id,
    local_path: input.local_path ?? homedir(),
    x: input.x,
    y: input.y,
  });
  if (error) throw error

  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, result.id) }).sync();
  if (!chat) {
    throw new Error("Chat not found after creation");
  }

  return chat;
});

const newSession = baseOs.api.chat.newSession.handler(async ({ input, context: { db, opencodeService } }) => {
  const [result, error] = await ctrlNewSession({ db, opencodeService }, { id: input.params.id });
  if (error) throw error

  dbUpdatePublisher.publish(result.canvas_id, { data: { change: 'update', id: result.id, table: 'chats', record: result } })

  return result;
});

const remove = baseOs.api.chat.remove.handler(async ({ input, context: { db, opencodeService } }) => {
  const [, error] = ctrlDeleteChat({ db, opencodeService }, { id: input.params.id });
  if (error) throw error
});

export const chat = {
  list,
  create,
  newSession,
  remove,
};
