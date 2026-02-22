import type { Repo } from "@automerge/automerge-repo";
import type { TCanvasDoc, TChatData } from "@vibecanvas/shell/automerge/types/canvas-doc";
import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { type OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import { eq } from "drizzle-orm";
import { homedir } from 'os';
import { createElement } from "../automerge/fn.create-element";

type TPortal = {
  db: typeof db;
  repo: Repo;
  opencodeService: OpencodeService;
};

type TArgs = Pick<TChat, 'canvas_id' | 'title' | 'local_path'> & { x: number, y: number };

type TChat = typeof schema.chats.$inferSelect;

function createChatElement(id: string, x: number, y: number) {
  const data: TChatData = {
    type: 'chat' as const,
    w: 360,
    h: 460,
    isCollapsed: false,
  }
  const style = {
    backgroundColor: '#f8f9fa',
    strokeColor: '#ced4da',
    strokeWidth: 1,
    opacity: 1,
  }
  return createElement(id, x, y, data, style)
}

export async function ctrlCreateChat(portal: TPortal, args: TArgs): Promise<TErrTuple<TChat>> {
  try {
    const canvas = portal.db.query.canvas.findFirst({ where: eq(schema.canvas.id, args.canvas_id) }).sync()
    if (!canvas) {
      return [null, { code: "CTRL.CHAT.CREATE_CHAT.CANVAS_NOT_FOUND", statusCode: 404, externalMessage: { en: "Canvas not found" } }];
    }

    const chatId = crypto.randomUUID()

    const newSession = await portal.opencodeService.getClient(canvas.id).session.create({ directory: args.local_path })
    if (newSession.error) {
      return [null, { code: "CTRL.CHAT.CREATE_CHAT.FAILED", statusCode: 500, internalLogLevel: 'error', shouldLogInternally: true, internalMessage: JSON.stringify(newSession.error), externalMessage: { en: "Failed to create chat" } }];
    }


    const chatData: typeof schema.chats.$inferInsert = {
      id: chatId,
      canvas_id: args.canvas_id,
      title: args.title,
      session_id: newSession.data.id,
      local_path: args.local_path,
    } as const;
    const chat = portal.db.insert(schema.chats).values(chatData).returning().all()[0]!;

    try {
      const handle = await portal.repo.find<TCanvasDoc>(canvas.automerge_url as any)
      handle.change(doc => {
        doc.elements[chat.id] = createChatElement(chat.id, args.x, args.y)
      })
    } catch (error) {
      portal.db.delete(schema.chats).where(eq(schema.chats.id, chat.id)).run()
      return [null, { code: "CTRL.CHAT.CREATE_CHAT.FAILED", statusCode: 500, externalMessage: { en: "Failed to create chat" } }];
    }

    return [chat, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.CHAT.CREATE_CHAT.FAILED", statusCode: 500, externalMessage: { en: "Failed to create chat" } }];
  }
}