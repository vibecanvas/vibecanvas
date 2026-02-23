import { ORPCError } from "@orpc/server";
import { baseOs } from "../orpc.base";

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

function getGlobalClientKey(): string {
  return "__opencode__global__";
}

const appAgents = baseOs.api.opencode.app.agents.handler(async ({ context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.app.agents();
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const pathGet = baseOs.api.opencode.path.get.handler(async ({ context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.path.get();
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const configProviders = baseOs.api.opencode.config.providers.handler(async ({ context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.config.providers();
  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const sessionCommand = baseOs.api.opencode.session.command.handler(async ({ input, context: { db, opencodeService } }) => {
  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.path.id) }).sync();
  if (!chat) throw new ORPCError("CHAT_NOT_FOUND", { message: "Chat not found" });

  const client = opencodeService.getClient(chat.id);

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
  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.path.id) }).sync();
  if (!chat) throw new ORPCError("CHAT_NOT_FOUND", { message: "Chat not found" });

  const client = opencodeService.getClient(chat.id);

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

const findText = baseOs.api.opencode.find.text.handler(async ({ input, context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.find.text({
    pattern: input.query.pattern,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const findFiles = baseOs.api.opencode.find.files.handler(async ({ input, context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const dirs = input.query.type === "directory" ? "true" : input.query.type === "file" ? "false" : undefined;

  const { data, error } = await client.find.files({
    query: input.query.query,
    type: input.query.type,
    limit: input.query.limit,
    dirs,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const fileRead = baseOs.api.opencode.file.read.handler(async ({ input, context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.file.read({
    path: input.query.path,
  });

  if (error) throwFromOpencodeError(error);
  if (!data) throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

const authSet = baseOs.api.opencode.auth.set.handler(async ({ input, context: { opencodeService } }) => {
  const client = opencodeService.getClient(getGlobalClientKey());

  const { data, error } = await client.auth.set({
    providerID: input.path.id,
    auth: input.body,
  });

  if (error) throwFromOpencodeError(error);
  if (typeof data !== "boolean") throw new ORPCError("OPENCODE_ERROR", { message: "Missing OpenCode response data" });

  return data;
});

export const opencode = {
  app: {
    agents: appAgents,
  },
  path: {
    get: pathGet,
  },
  config: {
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
