import { dirname, isAbsolute, normalize, resolve, sep } from "node:path";
import {
  LspServerInfoByLanguage,
  resolveLspLanguageFromPath,
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
  process: { kill(signal?: NodeJS.Signals | number): boolean } | null;
  stdin: { write(chunk: string): boolean } | null;
  stdoutBuffer: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
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
  private static readonly IDLE_SHUTDOWN_MS = 30_000;

  private outboundSender: ((payload: TLspOutboundMessage) => void) | null = null;
  private readonly sessions = new Map<TLspSessionKey, TSessionState>();
  private readonly attachments = new Map<string, TClientAttachment>();

  private readonly requestMap = new Map<number, { attachmentKey: string; clientRequestId: unknown }>();
  private nextUpstreamRequestId = 1;

  constructor(private vibecanvasDirectory: string) {
    this.vibecanvasDirectory = normalize(vibecanvasDirectory);
  }

  setOutboundSender(sender: (payload: TLspOutboundMessage) => void): void {
    this.outboundSender = sender;
  }

  async openChannel(args: TLspOpenChannelArgs): Promise<void> {
    const normalized = this.normalizeOpenArgs(args);
    this.validateOpenChannelArgs(normalized);
    if (this.handleOpenChannelIdempotency(normalized)) {
      return;
    }
    const projectRoot = await this.resolveProjectRoot(normalized);
    const session = await this.getOrCreateSession(normalized.language, projectRoot);
    this.attachClientToSession(session, normalized);

    this.emitOutbound({
      requestId: normalized.requestId,
      clientId: normalized.clientId,
      message: JSON.stringify({
        type: "lsp.channel.opened",
        language: normalized.language,
        projectRoot,
      }),
    });

    return;
  }

  handleClientMessage(args: TLspClientMessageArgs): void {
    const attachmentKey = this.attachmentKey(args);
    const attachment = this.attachments.get(attachmentKey);
    if (!attachment) {
      throw new Error("LspService.handleClientMessage missing attachment");
    }

    const session = this.sessions.get(attachment.sessionKey);
    if (!session) {
      throw new Error("LspService.handleClientMessage missing session");
    }

    const outboundPayload = this.remapClientMessageForServer(args.message, attachmentKey);
    if (!session.stdin) {
      throw new Error("LspService.handleClientMessage missing session stdin");
    }

    session.stdin.write(this.toLspFrame(outboundPayload));
  }

  closeChannel(args: TLspClientRef): void {
    const key = this.attachmentKey(args);
    const attachment = this.attachments.get(key);
    if (!attachment) return;

    const session = this.sessions.get(attachment.sessionKey);
    if (session) {
      session.attachedClients.delete(key);
      this.clearSessionIdleTimer(session);
      if (session.attachedClients.size === 0) {
        session.idleSince = Date.now();
        session.idleTimer = setTimeout(() => {
          this.destroySession(session.key);
        }, LspService.IDLE_SHUTDOWN_MS);
      }
    }

    this.attachments.delete(key);
    this.cleanupRequestMappingsForAttachment(key);
  }

  closeAllForRequest(requestId: string): void {
    const toClose: TLspClientRef[] = [];
    for (const attachment of this.attachments.values()) {
      if (attachment.requestId !== requestId) continue;
      toClose.push({ requestId: attachment.requestId, clientId: attachment.clientId });
    }

    for (const ref of toClose) {
      this.closeChannel(ref);
    }
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
    for (const key of this.sessions.keys()) {
      this.destroySession(key);
    }
    this.attachments.clear();
    this.requestMap.clear();
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

  private normalizeOpenArgs(args: TLspOpenChannelArgs): TLspOpenChannelArgs {
    const inferredLanguage = resolveLspLanguageFromPath(args.filePath);
    if (!inferredLanguage) return args;
    return {
      ...args,
      language: inferredLanguage,
    };
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

  private async getOrCreateSession(language: TLspLanguage, projectRoot: string): Promise<TSessionState> {
    const key = this.toSessionKey(language, projectRoot);
    const existing = this.sessions.get(key);
    if (existing) {
      this.clearSessionIdleTimer(existing);
      existing.idleSince = null;
      return existing;
    }

    const serverInfo = this.getServerInfo(language);
    if (!serverInfo) {
      throw new Error(`LspService.getOrCreateSession unsupported language: ${language}`);
    }

    const handle = await serverInfo.spawn(projectRoot, this.vibecanvasDirectory);
    if (!handle) {
      throw new Error(`LspService.getOrCreateSession failed to spawn language server: ${language}`);
    }

    const session: TSessionState = {
      key,
      language,
      projectRoot,
      attachedClients: new Set<string>(),
      pid: handle.process.pid ?? null,
      idleSince: null,
      process: handle.process,
      stdin: handle.process.stdin,
      stdoutBuffer: "",
      idleTimer: null,
    };

    handle.process.stdout.setEncoding("utf8");
    handle.process.stdout.on("data", (chunk: string) => {
      this.handleServerStdout(session.key, chunk);
    });
    handle.process.on("exit", () => {
      this.destroySession(session.key);
    });
    handle.process.on("error", () => {
      this.destroySession(session.key);
    });

    this.sessions.set(key, session);
    return session;
  }

  private attachClientToSession(session: TSessionState, args: TLspOpenChannelArgs): void {
    const key = this.attachmentKey(args);
    session.attachedClients.add(key);
    this.attachments.set(key, {
      requestId: args.requestId,
      clientId: args.clientId,
      sessionKey: session.key,
      language: args.language,
      filePath: this.normalizePath(args.filePath),
    });
  }

  private clearSessionIdleTimer(session: TSessionState): void {
    if (!session.idleTimer) return;
    clearTimeout(session.idleTimer);
    session.idleTimer = null;
  }

  private destroySession(key: TLspSessionKey): void {
    const session = this.sessions.get(key);
    if (!session) return;

    this.clearSessionIdleTimer(session);
    for (const attachmentKey of session.attachedClients) {
      this.attachments.delete(attachmentKey);
      this.cleanupRequestMappingsForAttachment(attachmentKey);
    }

    try {
      session.process?.kill();
    } catch {
      // ignore process kill errors during shutdown
    }

    this.sessions.delete(key);
  }

  private remapClientMessageForServer(rawMessage: string, attachmentKey: string): string {
    const payload = JSON.parse(rawMessage) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(payload, "id") && payload.id !== undefined) {
      const upstreamId = this.nextUpstreamRequestId++;
      this.requestMap.set(upstreamId, { attachmentKey, clientRequestId: payload.id });
      payload.id = upstreamId;
    }
    return JSON.stringify(payload);
  }

  private toLspFrame(json: string): string {
    const contentLength = Buffer.byteLength(json, "utf8");
    return `Content-Length: ${contentLength}\r\n\r\n${json}`;
  }

  private handleServerStdout(sessionKey: TLspSessionKey, chunk: string): void {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    session.stdoutBuffer += chunk;
    while (true) {
      const headerEnd = session.stdoutBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = session.stdoutBuffer.slice(0, headerEnd);
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!lengthMatch) {
        session.stdoutBuffer = session.stdoutBuffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (session.stdoutBuffer.length < bodyEnd) return;

      const body = session.stdoutBuffer.slice(bodyStart, bodyEnd);
      session.stdoutBuffer = session.stdoutBuffer.slice(bodyEnd);
      this.routeServerMessage(session, body);
    }
  }

  private routeServerMessage(session: TSessionState, rawMessage: string): void {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawMessage) as Record<string, unknown>;
    } catch {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "id") && typeof payload.id === "number") {
      const mapped = this.requestMap.get(payload.id);
      if (mapped) {
        this.requestMap.delete(payload.id);
        payload.id = mapped.clientRequestId;
        const attachment = this.attachments.get(mapped.attachmentKey);
        if (attachment) {
          this.emitOutbound({
            requestId: attachment.requestId,
            clientId: attachment.clientId,
            message: JSON.stringify(payload),
          });
          return;
        }
      }
    }

    const message = JSON.stringify(payload);
    for (const attachmentKey of session.attachedClients) {
      const attachment = this.attachments.get(attachmentKey);
      if (!attachment) continue;
      this.emitOutbound({
        requestId: attachment.requestId,
        clientId: attachment.clientId,
        message,
      });
    }
  }

  private cleanupRequestMappingsForAttachment(attachmentKey: string): void {
    for (const [requestId, mapped] of this.requestMap.entries()) {
      if (mapped.attachmentKey !== attachmentKey) continue;
      this.requestMap.delete(requestId);
    }
  }
}
