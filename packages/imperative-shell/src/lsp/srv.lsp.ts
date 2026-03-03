import { dirname, isAbsolute, normalize, resolve, sep } from "node:path";
import {
  LspServerInfoByLanguage,
  type TLspLanguage,
  type TLspServerInfo,
} from "./srv.lsp-server-info";

export type { TLspLanguage } from "./srv.lsp-server-info";

export type TLspClientRef = {
  // App transport key (NOT an LSP protocol field).
  requestId: string;
  // Logical editor-channel key (NOT an LSP protocol field).
  clientId: string;
};

export type TLspOpenChannelArgs = TLspClientRef & {
  language: TLspLanguage;
  filePath: string;
  // App-level hint (NOT an LSP protocol key). Server may ignore if invalid.
  rootHint?: string;
};

export type TLspClientMessageArgs = TLspClientRef & {
  // Raw JSON-RPC/LSP payload. Inside this JSON, protocol-owned keys include:
  // `jsonrpc`, `id`, `method`, `params`, `result`, and `error`.
  // Do not rewrite/remove these keys except controlled request-id remapping.
  message: string;
};

export type TLspOutboundMessage = TLspClientRef & {
  // Raw JSON-RPC/LSP payload from server to editor channel.
  // Same protocol-owned key rules as TLspClientMessageArgs.message.
  message: string;
};

export type TLspSessionKey = `${string}:${string}`;

export type TLspSessionSnapshot = {
  key: TLspSessionKey;
  language: TLspLanguage;
  projectRoot: string;
  attachedClients: number;
  pid: number | null;
  idleSince: number | null;
};


type TSessionState = {
  key: TLspSessionKey;
  language: TLspLanguage;
  projectRoot: string;
  attachedClients: Set<string>;
  pid: number | null;
  idleSince: number | null;
};

type TClientAttachment = {
  requestId: string;
  clientId: string;
  sessionKey: TLspSessionKey;
  language: TLspLanguage;
  filePath: string;
};

export interface ILspService {
  setOutboundSender(sender: (payload: TLspOutboundMessage) => void): void;
  openChannel(args: TLspOpenChannelArgs): Promise<void>;
  handleClientMessage(args: TLspClientMessageArgs): void;
  closeChannel(args: TLspClientRef): void;
  closeAllForRequest(requestId: string): void;
  listSessions(): TLspSessionSnapshot[];
  shutdown(): Promise<void>;
}

export class LspService implements ILspService {
  private outboundSender: ((payload: TLspOutboundMessage) => void) | null = null;
  private readonly sessions = new Map<TLspSessionKey, TSessionState>();
  private readonly attachments = new Map<string, TClientAttachment>();

  // TODO: add upstream-request-id remapping table for multiplexed JSON-RPC.
  private readonly requestMap = new Map<number, string>();

  constructor(private vibecanvasDirectory: string) {

  }

  setOutboundSender(sender: (payload: TLspOutboundMessage) => void): void {
    this.outboundSender = sender;
  }

  async openChannel(args: TLspOpenChannelArgs): Promise<void> {
    this.validateOpenChannelArgs(args);
    if (this.handleOpenChannelIdempotency(args)) {
      return;
    }
    const projectRoot = await this.resolveProjectRoot(args);
    void projectRoot;

    // TODO: resolve root + server flavor, spawn/reuse pooled session, and attach logical client.
    throw new Error("LspService.openChannel not implemented");
  }

  handleClientMessage(args: TLspClientMessageArgs): void {
    // TODO: remap request IDs and forward JSON-RPC payload to the matching pooled LSP session.
    void args;
    throw new Error("LspService.handleClientMessage not implemented");
  }

  closeChannel(args: TLspClientRef): void {
    // TODO: detach logical client from session and schedule idle shutdown when ref-count reaches zero.
    void args;
    throw new Error("LspService.closeChannel not implemented");
  }

  closeAllForRequest(requestId: string): void {
    // TODO: detach all logical clients associated with one websocket request context.
    void requestId;
    throw new Error("LspService.closeAllForRequest not implemented");
  }

  listSessions(): TLspSessionSnapshot[] {
    return Array.from(this.sessions.values()).map((session) => ({
      key: session.key,
      language: session.language,
      projectRoot: session.projectRoot,
      attachedClients: session.attachedClients.size,
      pid: session.pid,
      idleSince: session.idleSince,
    }));
  }

  async shutdown(): Promise<void> {
    // TODO: terminate all child processes, clear timers/maps, and release listeners.
    throw new Error("LspService.shutdown not implemented");
  }

  private attachmentKey(ref: TLspClientRef): string {
    return `${ref.requestId}::${ref.clientId}`;
  }

  private toSessionKey(language: TLspLanguage, projectRoot: string): TLspSessionKey {
    return `${language}:${projectRoot}`;
  }

  private emitOutbound(payload: TLspOutboundMessage): void {
    if (!this.outboundSender) return;
    this.outboundSender(payload);
  }

  private validateOpenChannelArgs(args: TLspOpenChannelArgs): void {
    if (!args.requestId || args.requestId.trim().length === 0) {
      throw new Error("LspService.openChannel invalid requestId");
    }

    if (!args.clientId || args.clientId.trim().length === 0) {
      throw new Error("LspService.openChannel invalid clientId");
    }

    if (!args.filePath || args.filePath.trim().length === 0) {
      throw new Error("LspService.openChannel invalid filePath");
    }

    if (!this.getServerInfo(args.language)) {
      throw new Error(`LspService.openChannel unsupported language: ${String(args.language)}`);
    }
  }

  private handleOpenChannelIdempotency(args: TLspOpenChannelArgs): boolean {
    const key = this.attachmentKey(args);
    const existing = this.attachments.get(key);
    if (!existing) return false;

    const sameTarget = existing.language === args.language && existing.filePath === args.filePath;
    if (sameTarget) {
      return true;
    }

    const existingSession = this.sessions.get(existing.sessionKey);
    existingSession?.attachedClients.delete(key);
    this.attachments.delete(key);
    return false;
  }

  private async resolveProjectRoot(args: TLspOpenChannelArgs): Promise<string> {
    const serverInfo = this.getServerInfo(args.language);
    if (!serverInfo) {
      throw new Error(`LspService.resolveProjectRoot unsupported language: ${String(args.language)}`);
    }

    const normalizedFilePath = this.normalizePath(args.filePath);
    const normalizedRootHint = args.rootHint ? this.normalizePath(args.rootHint) : null;
    const detectedRoot = await serverInfo.root(normalizedFilePath, this.vibecanvasDirectory);

    if (normalizedRootHint && this.isPathInside(normalizedRootHint, normalizedFilePath)) {
      return normalizedRootHint;
    }

    if (detectedRoot) {
      return this.normalizePath(detectedRoot);
    }

    return dirname(normalizedFilePath);
  }

  private normalizePath(pathValue: string): string {
    const trimmed = pathValue.trim();
    const absolute = isAbsolute(trimmed) ? trimmed : resolve(this.vibecanvasDirectory, trimmed);
    return normalize(absolute);
  }

  private isPathInside(rootPath: string, candidatePath: string): boolean {
    if (rootPath === candidatePath) return true;

    const withTrailingSep = rootPath.endsWith(sep) ? rootPath : `${rootPath}${sep}`;
    return candidatePath.startsWith(withTrailingSep);
  }

  private getServerInfo(language: TLspLanguage): TLspServerInfo | undefined {
    return LspServerInfoByLanguage[language];
  }
}
