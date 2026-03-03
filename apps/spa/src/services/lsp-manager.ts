import { LANGUAGE_EXTENSIONS } from "@vibecanvas/shell/lsp/language";
import { orpcWebsocketService } from "@/services/orpc-websocket";

type TLspChannelOpenedEvent = {
  type: "opened";
  channelId: string;
  language: string;
  projectRoot: string;
};

type TLspChannelMessageEvent = {
  type: "message";
  channelId: string;
  message: string;
};

type TLspChannelErrorEvent = {
  type: "error";
  channelId: string;
  message: string;
};

type TLspEvent = TLspChannelOpenedEvent | TLspChannelMessageEvent | TLspChannelErrorEvent;

const LANGUAGE_TO_LSP = {
  typescript: "typescript",
  typescriptreact: "typescript",
  javascript: "typescript",
  javascriptreact: "typescript",
  vue: "vue",
  python: "python",
  go: "gopls",
  ruby: "ruby-lsp",
  elixir: "elixir-ls",
  zig: "zls",
  csharp: "csharp",
  fsharp: "fsharp",
  swift: "sourcekit-lsp",
  rust: "rust",
  c: "clangd",
  cpp: "clangd",
  svelte: "svelte",
  astro: "astro",
  java: "jdtls",
  kotlin: "kotlin-ls",
  yaml: "yaml-ls",
  lua: "lua-ls",
  php: "php-intelephense",
  prisma: "prisma",
  dart: "dart",
  ocaml: "ocaml-lsp",
  shellscript: "bash",
  terraform: "terraform",
  "terraform-vars": "terraform",
  dockerfile: "dockerfile",
  gleam: "gleam",
  clojure: "clojure-lsp",
  nix: "nixd",
  typst: "tinymist",
  haskell: "haskell-language-server",
  julia: "julials",
} as const;

type TLspServerLanguage = typeof LANGUAGE_TO_LSP[keyof typeof LANGUAGE_TO_LSP];

function hasLanguageMapping(key: string): key is keyof typeof LANGUAGE_TO_LSP {
  return key in LANGUAGE_TO_LSP;
}

type TOpenChannelArgs = {
  channelId: string;
  filePath: string;
  rootHint?: string;
};

class LspManagerService {
  private readonly messageListeners = new Map<string, Set<(message: string) => void>>();
  private readonly openedListeners = new Map<string, Set<(event: TLspChannelOpenedEvent) => void>>();
  private readonly errorListeners = new Map<string, Set<(event: TLspChannelErrorEvent) => void>>();
  private eventsAbortController: AbortController | null = null;
  private isStreamingEvents = false;

  async openChannel(args: TOpenChannelArgs): Promise<boolean> {
    this.ensureEventStream();

    const resolvedLanguage = this.resolveLspLanguage(args.filePath);
    if (!resolvedLanguage) {
      return false;
    }

    const [error, result] = await orpcWebsocketService.safeClient.api.lsp.open({
      channelId: args.channelId,
      filePath: args.filePath,
      rootHint: args.rootHint,
      language: resolvedLanguage,
    });

    if (error || !result) return false;
    return "success" in result && result.success === true;
  }

  async send(channelId: string, message: string): Promise<boolean> {
    const [error, result] = await orpcWebsocketService.safeClient.api.lsp.send({ channelId, message });
    if (error || !result) return false;
    return "success" in result && result.success === true;
  }

  async closeChannel(channelId: string): Promise<void> {
    await orpcWebsocketService.safeClient.api.lsp.close({ channelId });
    this.messageListeners.delete(channelId);
    this.openedListeners.delete(channelId);
    this.errorListeners.delete(channelId);
  }

  onChannelMessage(channelId: string, handler: (message: string) => void): () => void {
    this.ensureEventStream();
    this.addListener(this.messageListeners, channelId, handler);
    return () => this.removeListener(this.messageListeners, channelId, handler);
  }

  onChannelOpened(channelId: string, handler: (event: TLspChannelOpenedEvent) => void): () => void {
    this.ensureEventStream();
    this.addListener(this.openedListeners, channelId, handler);
    return () => this.removeListener(this.openedListeners, channelId, handler);
  }

  onChannelError(channelId: string, handler: (event: TLspChannelErrorEvent) => void): () => void {
    this.ensureEventStream();
    this.addListener(this.errorListeners, channelId, handler);
    return () => this.removeListener(this.errorListeners, channelId, handler);
  }

  private ensureEventStream(): void {
    if (this.isStreamingEvents) return;
    this.isStreamingEvents = true;
    this.eventsAbortController = new AbortController();
    void this.streamEvents(this.eventsAbortController);
  }

  private async streamEvents(abortController: AbortController): Promise<void> {
    try {
      const [error, iterator] = await orpcWebsocketService.safeClient.api.lsp.events({}, { signal: abortController.signal });
      if (error || !iterator) {
        this.isStreamingEvents = false;
        return;
      }

      for await (const event of iterator) {
        this.dispatchEvent(event as TLspEvent);
      }
    } catch {
      // Stream ends on disconnect/reconnect; manager lazily restarts on next demand.
    } finally {
      this.isStreamingEvents = false;
      this.eventsAbortController = null;
    }
  }

  private dispatchEvent(event: TLspEvent): void {
    if (event.type === "message") {
      const listeners = this.messageListeners.get(event.channelId);
      if (!listeners) return;
      for (const listener of listeners) listener(event.message);
      return;
    }

    if (event.type === "opened") {
      const listeners = this.openedListeners.get(event.channelId);
      if (!listeners) return;
      for (const listener of listeners) listener(event);
      return;
    }

    const listeners = this.errorListeners.get(event.channelId);
    if (!listeners) return;
    for (const listener of listeners) listener(event);
  }

  private addListener<T>(store: Map<string, Set<(payload: T) => void>>, channelId: string, listener: (payload: T) => void): void {
    const existing = store.get(channelId);
    if (existing) {
      existing.add(listener);
      return;
    }
    store.set(channelId, new Set([listener]));
  }

  private removeListener<T>(store: Map<string, Set<(payload: T) => void>>, channelId: string, listener: (payload: T) => void): void {
    const listeners = store.get(channelId);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) store.delete(channelId);
  }

  private resolveLspLanguage(filePath: string): TLspServerLanguage | undefined {
    const lower = filePath.toLowerCase();
    const fileName = lower.split(/[\\/]/).pop() ?? lower;
    const extensionIndex = fileName.lastIndexOf(".");
    const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex) : "";
    const language = LANGUAGE_EXTENSIONS[extension] ?? LANGUAGE_EXTENSIONS[fileName] ?? null;
    if (!language) return undefined;
    if (!hasLanguageMapping(language)) return undefined;
    return LANGUAGE_TO_LSP[language];
  }
}

export const lspManagerService = new LspManagerService();
