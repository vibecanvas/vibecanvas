import { ORPCError } from "@orpc/server";
import { agent_logs } from "@vibecanvas/shell/database/schema";
import { baseOs } from "../orpc.base";
import type { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import type db from "@vibecanvas/shell/database/db";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("data" in error && typeof error.data === "object" && error.data !== null && "message" in error.data && typeof error.data.message === "string") {
      return error.data.message;
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "OpenCode request failed";
}

function throwFromOpencodeError(error: unknown): never {
  if (typeof error === "object" && error !== null && "name" in error && error.name === "NotFoundError") {
    throw new ORPCError("NOT_FOUND", { message: getErrorMessage(error) });
  }

  if (typeof error === "object" && error !== null && "success" in error && error.success === false) {
    throw new ORPCError("BAD_REQUEST", { message: "Bad request" });
  }

  throw new ORPCError("OPENCODE_ERROR", { message: getErrorMessage(error) });
}

function requireChatContext(
  dbClient: typeof db,
  opencodeService: OpencodeService,
  chatId: string,
) {
  const chat = dbClient.query.chats.findFirst({ where: (table: any, { eq }: any) => eq(table.id, chatId) }).sync();
  if (!chat) throw new ORPCError("CHAT_NOT_FOUND", { message: "Chat not found" });

  const client = opencodeService.getClient(chat.id, chat.local_path);
  return { chat, client };
}

// Base64 Images
// Send images and other binary files using data URLs in the url field of file parts.
// ---
// Format
// Pattern: data:<mime-type>;base64,<base64-data>
// For images:
// - PNG: data:image/png;base64,<base64-string>
// - JPEG: data:image/jpeg;base64,<base64-string>
// - WebP: data:image/webp;base64,<base64-string>
// ---
// Example
// With a base64 string:
// const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
// await client.session.prompt({
//   sessionID: chat.session_id,
//   parts: [
//     {
//       type: 'file',
//       mime: 'image/png',
//       url: `data:image/png;base64,${base64}`,
//       filename: 'screenshot.png'
//     },
//     {
//       type: 'text',
//       text: 'What do you see in this image?'
//     }
//   ]
// })
// From a file:
// import { readFile } from 'fs/promises'
// const buffer = await readFile('./image.png')
// const base64 = buffer.toString('base64')
// await client.session.prompt({
//   sessionID: chat.session_id,
//   parts: [
//     {
//       type: 'file',
//       mime: 'image/png',
//       url: `data:image/png;base64,${base64}`
//     }
//   ]
// })
// ---
// Notes
// - The mime type should match the data URL
// - filename is optional but helps with context
// - Works for any binary format supported by the LLM
// - Avoid sending very large images (check model limits)
const prompt = baseOs.api.opencode.prompt.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.prompt({
    sessionID: chat.session_id,
    agent: input.agent,
    model: input.model,
    parts: input.parts,
    tools: {},
    directory: chat.local_path,
  });

  if (error) {
    if ("name" in error && error.name === "NotFoundError") {
      throw new ORPCError("SESSION_NOT_FOUND", {
        message: error.data.message,
      });
    }

    console.error("opencode prompt bad request " + JSON.stringify(error, null, 2));
    throw new ORPCError("BAD_REQUEST", {
      message: "Bad request",
    });
  }

  const userMessageID = data.info.parentID;
  const { data: userMessage, error: userMessageError } = await client.session.message({
    sessionID: chat.session_id,
    messageID: userMessageID,
  });

  if (userMessageError) {
    console.error("opencode message bad request " + JSON.stringify(userMessageError, null, 2));
    throw new ORPCError("BAD_REQUEST", {
      message: "Bad request",
    });
  }

  db.transaction((tx) => {
    tx.insert(agent_logs).values({
      id: data.info.parentID,
      canvas_id: chat.canvas_id,
      session_id: data.info.sessionID,
      timestamp: new Date(),
      data: userMessage,
    }).run();

    tx.insert(agent_logs).values({
      id: data.info.id,
      canvas_id: chat.canvas_id,
      session_id: data.info.sessionID,
      timestamp: new Date(),
      data,
    }).run();
  });

  return data;
});

const events = baseOs.api.opencode.events.handler(async function* ({ input, context: { db, opencodeService } }) {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);
  for await (const event of (await client.event.subscribe({ directory: chat.local_path })).stream) {
    yield event;
  }
});

const appLog = baseOs.api.opencode.app.log.handler(async ({ input, context: { opencodeService } }) => {
  const client = opencodeService.getClient("__app__");

  const { data, error } = await client.app.log(input);
  if (error) throwFromOpencodeError(error);
  if (data === null || data === undefined) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const appAgents = baseOs.api.opencode.app.agents.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.app.agents({ directory: chat.local_path });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const pathGet = baseOs.api.opencode.path.get.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.path.get({ directory: chat.local_path });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const configGet = baseOs.api.opencode.config.get.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.config.get();
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const configProviders = baseOs.api.opencode.config.providers.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.config.providers();
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionCommand = baseOs.api.opencode.session.command.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.command({
    sessionID: chat.session_id,
    directory: chat.local_path,
    messageID: input.body.messageID,
    agent: input.body.agent,
    model: input.body.model,
    arguments: input.body.arguments,
    command: input.body.command,
    variant: input.body.variant,
    parts: input.body.parts,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionShell = baseOs.api.opencode.session.shell.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.shell({
    sessionID: chat.session_id,
    directory: chat.local_path,
    command: input.body.command,
    agent: input.body.agent,
    model: input.body.model,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const findText = baseOs.api.opencode.find.text.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.find.text({
    pattern: input.query.pattern,
    directory: chat.local_path,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const findFiles = baseOs.api.opencode.find.files.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const dirs = input.query.type === "directory" ? "true" : input.query.type === "file" ? "false" : undefined;

  const { data, error } = await client.find.files({
    query: input.query.query,
    type: input.query.type,
    limit: input.query.limit,
    dirs,
    directory: chat.local_path,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const fileRead = baseOs.api.opencode.file.read.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.file.read({
    path: input.query.path,
    directory: chat.local_path,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const authSet = baseOs.api.opencode.auth.set.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.auth.set({
    providerID: input.path.id,
    auth: input.body,
  });

  if (error) throwFromOpencodeError(error);
  if (typeof data !== "boolean") throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

export const opencode = {
  prompt,
  events,
  app: {
    log: appLog,
    agents: appAgents,
  },
  path: {
    get: pathGet,
  },
  config: {
    get: configGet,
    providers: configProviders,
  },
  session: {
    command: sessionCommand,
    shell: sessionShell,
  },
  find: {
    text: findText,
    files: findFiles,
  },
  file: {
    read: fileRead,
  },
  auth: {
    set: authSet,
  },
};
