import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import type { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import { eq, sql } from "drizzle-orm";

type TPortal = {
  db: typeof db;
  opencodeService: OpencodeService;
};

type TArgs = { id: string };

type TChat = typeof schema.chats.$inferSelect;

export async function ctrlNewSession(portal: TPortal, args: TArgs): Promise<TErrTuple<TChat>> {
  try {
    const chat = portal.db.query.chats.findFirst({ where: eq(schema.chats.id, args.id) }).sync();
    if (!chat) {
      return [null, {
        code: "CTRL.CHAT.NEW_SESSION.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Chat not found" },
      }];
    }

    const newSession = await portal.opencodeService.getClient(chat.canvas_id, chat.local_path).session.create({ directory: chat.local_path });
    if (newSession.error) {
      return [null, {
        code: "CTRL.CHAT.NEW_SESSION.SESSION_CREATE_FAILED",
        statusCode: 500,
        internalLogLevel: 'error',
        shouldLogInternally: true,
        internalMessage: JSON.stringify(newSession.error),
        externalMessage: { en: "Failed to create new session" },
      }];
    }

    const result = portal.db
      .update(schema.chats)
      .set({
        session_id: newSession.data.id,
        updated_at: sql`(unixepoch())`,
      })
      .where(eq(schema.chats.id, args.id))
      .returning()
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.CHAT.NEW_SESSION.UPDATE_FAILED",
        statusCode: 500,
        externalMessage: { en: "Failed to update chat session" },
      }];
    }

    return [result[0] as TChat, null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.CHAT.NEW_SESSION.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to create new session" },
    }];
  }
}
