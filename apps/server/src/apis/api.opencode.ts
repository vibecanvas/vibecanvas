import { ORPCError } from "@orpc/server";
import { baseOs } from "../orpc.base";
import type { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import type db from "@vibecanvas/shell/database/db";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("errors" in error && Array.isArray(error.errors) && error.errors.length > 0) {
      return JSON.stringify(error.errors[0]);
    }

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
    throw new ORPCError("BAD_REQUEST", { message: getErrorMessage(error) });
  }

  throw new ORPCError("OPENCODE_ERROR", { message: getErrorMessage(error) });
}

function getOpencodeBaseUrl(opencodeService: OpencodeService): string {
  const url = (opencodeService as unknown as {
    opencodeServer?: { url?: string }
  }).opencodeServer?.url;

  if (!url) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { message: "OpenCode service unavailable" });
  }

  return url;
}

function buildPtyConnectUrl(args: {
  opencodeService: OpencodeService;
  ptyID: string;
  cursor?: string;
  directory?: string;
}) {
  const baseUrl = getOpencodeBaseUrl(args.opencodeService);
  const url = new URL(`/pty/${encodeURIComponent(args.ptyID)}/connect`, baseUrl);
  if (args.directory && args.directory.length > 0) {
    url.searchParams.set("directory", args.directory);
  }
  if (args.cursor && args.cursor.length > 0) {
    url.searchParams.set("cursor", args.cursor);
  }
  return url.toString();
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

function getPtyClient(opencodeService: OpencodeService, workingDirectory: string) {
  return opencodeService.getClient(`pty:${workingDirectory}`, workingDirectory);
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

const sessionInit = baseOs.api.opencode.session.init.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const initParams: {
    sessionID: string;
    directory: string;
    modelID?: string;
    providerID?: string;
    messageID?: string;
  } = {
    sessionID: chat.session_id,
    directory: input.body?.path ?? chat.local_path,
  };

  if (typeof input.body?.modelID === "string") initParams.modelID = input.body.modelID;
  if (typeof input.body?.providerID === "string") initParams.providerID = input.body.providerID;
  if (typeof input.body?.messageID === "string") initParams.messageID = input.body.messageID;

  const { data, error } = await client.session.init(initParams);

  if (error) throwFromOpencodeError(error);
  if (typeof data !== "boolean") throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionUpdate = baseOs.api.opencode.session.update.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.update({
    sessionID: chat.session_id,
    directory: chat.local_path,
    title: input.body.title,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionCurrent = baseOs.api.opencode.session.current.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.get({
    sessionID: chat.session_id,
    directory: chat.local_path,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionMessages = baseOs.api.opencode.session.messages.handler(async ({ input, context: { db, opencodeService } }) => {
  const { chat, client } = requireChatContext(db, opencodeService, input.chatId);

  const { data, error } = await client.session.messages({
    sessionID: chat.session_id,
    directory: chat.local_path,
    limit: input.query?.limit,
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

const ptyList = baseOs.api.opencode.pty.list.handler(async ({ input, context: { opencodeService } }) => {
  const client = getPtyClient(opencodeService, input.workingDirectory);

  const { data, error } = await client.pty.list({ directory: input.workingDirectory });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const ptyCreate = baseOs.api.opencode.pty.create.handler(async ({ input, context: { opencodeService } }) => {
  const client = getPtyClient(opencodeService, input.workingDirectory);

  const { data, error } = await client.pty.create({
    directory: input.workingDirectory,
    ...(input.body ?? {}),
  });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const ptyGet = baseOs.api.opencode.pty.get.handler(async ({ input, context: { opencodeService } }) => {
  const client = getPtyClient(opencodeService, input.workingDirectory);

  const { data, error } = await client.pty.get({
    ptyID: input.path.ptyID,
    directory: input.workingDirectory,
  });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const ptyUpdate = baseOs.api.opencode.pty.update.handler(async ({ input, context: { opencodeService } }) => {
  const client = getPtyClient(opencodeService, input.workingDirectory);

  const { data, error } = await client.pty.update({
    ptyID: input.path.ptyID,
    directory: input.workingDirectory,
    ...(input.body ?? {}),
  });
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const ptyRemove = baseOs.api.opencode.pty.remove.handler(async ({ input, context: { opencodeService } }) => {
  const client = getPtyClient(opencodeService, input.workingDirectory);

  const { data, error } = await client.pty.remove({
    ptyID: input.path.ptyID,
    directory: input.workingDirectory,
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
    init: sessionInit,
    command: sessionCommand,
    shell: sessionShell,
    update: sessionUpdate,
    current: sessionCurrent,
    messages: sessionMessages,
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
  pty: {
    list: ptyList,
    create: ptyCreate,
    get: ptyGet,
    update: ptyUpdate,
    remove: ptyRemove,
  },
};

export { buildPtyConnectUrl, requireChatContext, throwFromOpencodeError };
