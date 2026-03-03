import { EventPublisher, ORPCError } from "@orpc/server";
import type { TLspEvent } from "@vibecanvas/core-contract/lsp.contract.ts";
import { LspService } from "@vibecanvas/shell/lsp/srv.lsp";
import { LspServerInfoByLanguage, type TLspLanguage } from "@vibecanvas/shell/lsp/srv.lsp-server-info";
import { baseOs } from "../orpc.base";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import * as fs from "fs";
import { tExternal } from "../error-fn";


const lspEventPublisher = new EventPublisher<Record<string, TLspEvent>>();
const [configPath, err] = txConfigPath({ fs, })
if (err) {
  console.error(tExternal(err))
  process.exit(1)
}
const lspService = new LspService(configPath.configDir);

lspService.setOutboundSender((payload) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.message);
  } catch {
    lspEventPublisher.publish(payload.requestId, {
      type: "message",
      channelId: payload.clientId,
      message: payload.message,
    });
    return;
  }

  if (typeof parsed === "object" && parsed !== null && "type" in parsed && (parsed as { type?: string }).type === "lsp.channel.opened") {
    const opened = parsed as { language?: string; projectRoot?: string };
    lspEventPublisher.publish(payload.requestId, {
      type: "opened",
      channelId: payload.clientId,
      language: opened.language ?? "unknown",
      projectRoot: opened.projectRoot ?? "",
    });
    return;
  }

  lspEventPublisher.publish(payload.requestId, {
    type: "message",
    channelId: payload.clientId,
    message: payload.message,
  });
});

function parseLanguage(language: string): TLspLanguage {
  if (language in LspServerInfoByLanguage) return language as TLspLanguage;
  throw new ORPCError("BAD_REQUEST", { message: "Invalid language" });
}

const open = baseOs.api.lsp.open.handler(async ({ input, context: { requestId } }) => {
  if (!requestId) {
    return { type: "ERROR", message: "Missing request context" };
  }

  try {
    await lspService.openChannel({
      requestId,
      clientId: input.channelId,
      language: parseLanguage(input.language),
      filePath: input.filePath,
      rootHint: input.rootHint,
    });

    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open LSP channel";
    lspEventPublisher.publish(requestId, {
      type: "error",
      channelId: input.channelId,
      message,
    });
    return { type: "ERROR", message };
  }
});

const send = baseOs.api.lsp.send.handler(async ({ input, context: { requestId } }) => {
  if (!requestId) {
    return { type: "ERROR", message: "Missing request context" };
  }

  try {
    lspService.handleClientMessage({
      requestId,
      clientId: input.channelId,
      message: input.message,
    });

    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to forward LSP message";
    lspEventPublisher.publish(requestId, {
      type: "error",
      channelId: input.channelId,
      message,
    });
    return { type: "ERROR", message };
  }
});

const close = baseOs.api.lsp.close.handler(async ({ input, context: { requestId } }) => {
  if (!requestId) {
    return { success: true as const };
  }

  lspService.closeChannel({
    requestId,
    clientId: input.channelId,
  });

  return { success: true as const };
});

const events = baseOs.api.lsp.events.handler(async function* ({ context: { requestId } }) {
  if (!requestId) {
    throw new ORPCError("BAD_REQUEST", { message: "Missing request context" });
  }

  for await (const event of lspEventPublisher.subscribe(requestId)) {
    yield event;
  }
});

function closeLspChannelsForRequest(requestId: string | undefined): void {
  if (!requestId) return;
  lspService.closeAllForRequest(requestId);
}

export const lsp = {
  open,
  send,
  close,
  events,
};

export { closeLspChannelsForRequest };
