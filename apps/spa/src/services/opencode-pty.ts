import { orpcWebsocketService } from "@/services/orpc-websocket";

export type TPty = Awaited<ReturnType<typeof orpcWebsocketService.client.api.opencode.pty.get>>;

export type TTerminalSessionState = {
  terminalKey: string;
  workingDirectory: string;
  ptyID: string;
  cursor: number;
  rows: number;
  cols: number;
  title: string;
  scrollY?: number;
};

type TPtyConnectArgs = {
  workingDirectory: string;
  ptyID: string;
  cursor?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
};

const TERMINAL_SESSION_KEY_PREFIX = "vibecanvas-terminal-session:";

function toSessionKey(terminalKey: string): string {
  return `${TERMINAL_SESSION_KEY_PREFIX}${terminalKey}`;
}

function buildPtyWebSocketUrl(args: { workingDirectory: string; ptyID: string; cursor?: number }): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`${protocol}//${window.location.host}/api/opencode/pty/${encodeURIComponent(args.ptyID)}/connect`);
  url.searchParams.set("workingDirectory", args.workingDirectory);
  if (typeof args.cursor === "number" && Number.isFinite(args.cursor)) {
    url.searchParams.set("cursor", `${Math.max(0, Math.floor(args.cursor))}`);
  }
  return url.toString();
}

function extractCursorFromJson(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.cursor === "number" && Number.isFinite(record.cursor)) {
    return Math.max(0, Math.floor(record.cursor));
  }

  const nestedKeys = ["meta", "state", "payload", "data", "event"];
  for (const key of nestedKeys) {
    if (key in record) {
      const nestedCursor = extractCursorFromJson(record[key]);
      if (nestedCursor !== null) return nestedCursor;
    }
  }

  return null;
}

function extractCursorFromMessageData(data: unknown): number | null {
  let rawText: string | null = null;

  if (typeof data === "string") {
    rawText = data;
  } else if (data instanceof ArrayBuffer) {
    rawText = new TextDecoder().decode(data);
  } else if (data instanceof Blob) {
    return null;
  }

  if (rawText === null) return null;

  const trimmed = rawText.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return extractCursorFromJson(parsed);
  } catch {
    return null;
  }
}

function extractCursorFromControlFrame(data: ArrayBuffer | Uint8Array): number | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length <= 1) return null;
  if (bytes[0] !== 0) return null;

  try {
    const payload = new TextDecoder().decode(bytes.subarray(1));
    const parsed = JSON.parse(payload);
    return extractCursorFromJson(parsed);
  } catch {
    return null;
  }
}

function saveTerminalSessionState(state: TTerminalSessionState) {
  localStorage.setItem(toSessionKey(state.terminalKey), JSON.stringify(state));
}

function loadTerminalSessionState(terminalKey: string): TTerminalSessionState | null {
  try {
    const raw = localStorage.getItem(toSessionKey(terminalKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TTerminalSessionState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.terminalKey !== terminalKey || typeof parsed.ptyID !== "string") return null;
    if (typeof parsed.workingDirectory !== "string") return null;

    return {
      terminalKey,
      workingDirectory: parsed.workingDirectory,
      ptyID: parsed.ptyID,
      cursor: typeof parsed.cursor === "number" ? parsed.cursor : 0,
      rows: typeof parsed.rows === "number" ? parsed.rows : 24,
      cols: typeof parsed.cols === "number" ? parsed.cols : 80,
      title: typeof parsed.title === "string" ? parsed.title : "Terminal",
      scrollY: typeof parsed.scrollY === "number" ? parsed.scrollY : undefined,
    };
  } catch {
    return null;
  }
}

function clearTerminalSessionState(terminalKey: string) {
  localStorage.removeItem(toSessionKey(terminalKey));
}

class OpencodePtyService {
  async list(workingDirectory: string) {
    return orpcWebsocketService.client.api.opencode.pty.list({ workingDirectory });
  }

  async create(workingDirectory: string, body?: { command?: string; args?: string[]; cwd?: string; title?: string; env?: Record<string, string> }) {
    return orpcWebsocketService.client.api.opencode.pty.create({ workingDirectory, body });
  }

  async get(workingDirectory: string, ptyID: string) {
    return orpcWebsocketService.client.api.opencode.pty.get({
      workingDirectory,
      path: { ptyID },
    });
  }

  async update(workingDirectory: string, ptyID: string, body: { title?: string; size?: { rows: number; cols: number } }) {
    return orpcWebsocketService.client.api.opencode.pty.update({
      workingDirectory,
      path: { ptyID },
      body,
    });
  }

  async remove(workingDirectory: string, ptyID: string) {
    return orpcWebsocketService.client.api.opencode.pty.remove({
      workingDirectory,
      path: { ptyID },
    });
  }

  connect(args: TPtyConnectArgs) {
    const ws = new WebSocket(buildPtyWebSocketUrl(args));

    ws.onopen = () => {
      args.onOpen?.();
    };

    ws.onclose = (event) => {
      args.onClose?.(event);
    };

    ws.onerror = (event) => {
      args.onError?.(event);
    };

    ws.onmessage = (event) => {
      args.onMessage?.(event);
    };

    return {
      socket: ws,
      close: () => ws.close(),
      send: (payload: string) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(payload);
      },
    };
  }
}

export const opencodePtyService = new OpencodePtyService();

export {
  buildPtyWebSocketUrl,
  clearTerminalSessionState,
  extractCursorFromJson,
  extractCursorFromControlFrame,
  extractCursorFromMessageData,
  loadTerminalSessionState,
  saveTerminalSessionState,
};
