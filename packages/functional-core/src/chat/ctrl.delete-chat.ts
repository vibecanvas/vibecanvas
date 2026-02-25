import db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import type { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import { eq } from "drizzle-orm";

type TPortal = {
  db: typeof db;
  opencodeService: OpencodeService;
};

type TArgs = {
  id: string;
};

export function ctrlDeleteChat(portal: TPortal, args: TArgs): TErrTuple<boolean> {
  try {

    const result = portal.db.delete(schema.chats).where(eq(schema.chats.id, args.id)).returning().all()
    const deletedChat = result.at(0)
    portal.opencodeService.closeClient(args.id)
    if (!deletedChat) return [false, null];

    return [true, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.CHAT.DELETE_CHAT.FAILED", statusCode: 500, externalMessage: { en: "Failed to delete chat" } }];
  }
}
