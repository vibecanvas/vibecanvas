import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { ClaudeRuntimeError, type ClaudeAgent } from "@vibecanvas/shell/claude-agent/srv.claude-agent";
import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { eq } from "drizzle-orm";
import { accessSync, constants } from "fs";

function checkPathAccess(path: string): { ok: true } | { ok: false; error: string } {
  try {
    accessSync(path, constants.R_OK | constants.W_OK);
    return { ok: true };
  } catch (err: any) {
    if (err.code === 'EPERM') {
      return {
        ok: false,
        error: `Permission denied: macOS TCC blocks access to "${path}". Grant Full Disk Access to Bun in System Preferences, or use a non-protected directory (avoid Documents, Desktop, Downloads).`
      };
    }
    if (err.code === 'ENOENT') {
      return { ok: false, error: `Path does not exist: "${path}"` };
    }
    if (err.code === 'EACCES') {
      return { ok: false, error: `Access denied to path: "${path}"` };
    }
    return { ok: false, error: `Cannot access path "${path}": ${err.message}` };
  }
}

type TPortal = {
  db: typeof db;
  ClaudeAgent: typeof ClaudeAgent;
};

type TArgs = {
  chatId: string;
  path: string;
  data: SDKUserMessage['message']['content']; // api just lets image and text block through, type currently to broad
};

type TDBUpdate = {
  type: 'db-update';
  id: string;
  data: {
    change: 'insert' | 'update' | 'delete';
    table: string;
    id: string;
    record: Record<string, unknown>;
  }
}

export default async function* ctrlAiPrompt(portal: TPortal, args: TArgs): AsyncIterable<TErrTuple<SDKMessage | TDBUpdate>> {
  if (typeof args.data === 'string') return //ignore, just type artefact as we can not access deep sdk types

  const chat = portal.db.query.chats.findFirst({ where: eq(schema.chats.id, args.chatId) }).sync()
  if (!chat) {
    const result: TErrTuple<SDKMessage> = [null, { code: "CTRL.WS.VIBECHAT_PROMPT.CHAT_NOT_FOUND", externalMessage: { en: "Chat not found" }, statusCode: 404 }];
    yield result;
    return;
  }
  const canvas = portal.db.query.canvas.findFirst({ where: eq(schema.canvas.id, chat.canvas_id) }).sync()
  if (!canvas) {
    const result: TErrTuple<SDKMessage> = [null, { code: "CTRL.WS.VIBECHAT_PROMPT.CANVAS_NOT_FOUND", externalMessage: { en: "Canvas not found" }, statusCode: 404 }];
    yield result;
    return;
  }

  const pathCheck = checkPathAccess(args.path);
  if (!pathCheck.ok) {
    yield [null, { code: "CTRL.WS.VIBECHAT_PROMPT.PATH_ACCESS_DENIED", externalMessage: { en: pathCheck.error }, statusCode: 403 }];
    return;
  }

  // TODO: maybe session_id can be infered from message instead of contructor params
  const agent = new portal.ClaudeAgent(chat.session_id, {
    cwd: args.path,
    allowDangerouslySkipPermissions: true,
    permissionMode: 'bypassPermissions',
    includePartialMessages: true,
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
    }
  });

  const userMessage: SDKUserMessage = {
    type: "user" as const,
    // @ts-ignore
    session_id: chat.session_id ?? undefined,
    parent_tool_use_id: null,
    message: {
      role: "user" as const,
      content: args.data,
    },
    isSynthetic: true,
  }

  try {
    for await (const message of agent.send(userMessage)) {
      if (message.type === 'system' && message.subtype === 'init') {
        // take message.session_id from system message and update chat

        const updatedChat = portal.db.update(schema.chats)
          .set({ session_id: message.session_id })
          .where(eq(schema.chats.id, args.chatId))
          .returning()
          .all()[0]

        // NOTE save user message
        userMessage.session_id = message.session_id;
        portal.db.insert(schema.agent_logs).values({ id: crypto.randomUUID(), canvas_id: chat.canvas_id, session_id: chat.session_id ?? message.session_id, timestamp: new Date(), type: 'CLAUDE_CODE', data: userMessage as unknown as SDKMessage }).run()

        yield [userMessage, null]
        yield [{ type: 'db-update', id: args.chatId, data: { change: 'update', table: 'chats', id: args.chatId, record: updatedChat } }, null];

      }

      // NOTE: only save assistant messages to the database
      if (message.type === 'assistant') portal.db.insert(schema.agent_logs).values({ id: message.uuid ?? crypto.randomUUID(), canvas_id: chat.canvas_id, session_id: message.session_id, timestamp: new Date(), type: 'CLAUDE_CODE', data: message }).run()
      yield [message, null];
    }
  } catch (error) {
    if (error instanceof ClaudeRuntimeError) {
      yield [
        null,
        {
          code: "CTRL.WS.VIBECHAT_PROMPT.CLAUDE_RUNTIME_UNAVAILABLE",
          externalMessage: { en: error.message },
          statusCode: 503,
        },
      ];
      return;
    }
    throw error;
  }

  return
}
