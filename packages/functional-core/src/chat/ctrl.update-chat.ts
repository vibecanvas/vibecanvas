import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { eq } from "drizzle-orm";

export type TPortal = {
  db: typeof db;
};

type TArgs = { id: string } & Partial<Pick<TChat, 'title'>>;

type TChat = typeof schema.chats.$inferSelect;

export function ctrlUpdateChat(portal: TPortal, args: TArgs): TErrTuple<TChat> {
  try {
    const updateData: Partial<typeof schema.chats.$inferInsert> = {};

    if (args.title !== undefined) updateData.title = args.title;

    const result = portal.db
      .update(schema.chats)
      .set(updateData)
      .where(eq(schema.chats.id, args.id))
      .returning()
      .all();

    if (result.length === 0) {
      return [null, {
        code: "CTRL.CHAT.UPDATE_CHAT.NOT_FOUND",
        statusCode: 404,
        externalMessage: { en: "Chat not found" }
      }];
    }

    return [result[0] as TChat, null];
  } catch (error) {
    console.error(error);
    return [null, {
      code: "CTRL.CHAT.UPDATE_CHAT.FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to update chat" }
    }];
  }
}