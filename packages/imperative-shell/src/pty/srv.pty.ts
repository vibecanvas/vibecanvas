export type TPtyStatus = "running" | "exited" | "error";

export type TPty = {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: TPtyStatus | string;
  pid: number;
  rows: number;
  cols: number;
  exitCode: number | null;
  signalCode: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TPtyCreateBody = {
  command?: string;
  args?: string[];
  cwd?: string;
  title?: string;
  env?: Record<string, string>;
  size?: {
    rows: number;
    cols: number;
  };
};

export type TPtyUpdateBody = {
  title?: string;
  size?: {
    rows: number;
    cols: number;
  };
};

type TPtyChunk = {
  start: number;
  end: number;
  data: Uint8Array;
};

type TPtyClient = {
  id: string;
  send: (data: Uint8Array) => void;
  close?: (code?: number, reason?: string) => void;
};

type TPtySession = {
  pty: TPty;
  terminal: Bun.Terminal;
  process: Bun.Subprocess<any, any, any>;
  chunks: TPtyChunk[];
  cursor: number;
  clients: Map<string, TPtyClient>;
};

type TPtyAttachArgs = {
  workingDirectory: string;
  ptyID: string;
  cursor?: number;
  send: (data: Uint8Array) => void;
  close?: (code?: number, reason?: string) => void;
};

type TGlobalWithPtyServicePromise = typeof globalThis & {
  __vibecanvasPtyServicePromise?: Promise<PtyService>;
};

const globalWithPtyServicePromise = globalThis as TGlobalWithPtyServicePromise;

const DEFAULT_ROWS = 24;
const DEFAULT_COLS = 80;
const MAX_REPLAY_BUFFER_BYTES = 1024 * 1024 * 4;

function normalizeSize(size?: { rows: number; cols: number }) {
  return {
    rows: Math.max(1, Math.floor(size?.rows ?? DEFAULT_ROWS)),
    cols: Math.max(1, Math.floor(size?.cols ?? DEFAULT_COLS)),
  };
}

function toUint8Array(data: Uint8Array<ArrayBuffer>): Uint8Array {
  return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

function getDefaultShellCommand(): string {
  return process.env.SHELL || "/bin/bash";
}

function toWritableBytes(payload: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
}

export class PtyService {
  #sessions = new Map<string, TPtySession>();
  #shuttingDown = false;

  private constructor() {}

  static async init(): Promise<PtyService> {
    if (globalWithPtyServicePromise.__vibecanvasPtyServicePromise) {
      return globalWithPtyServicePromise.__vibecanvasPtyServicePromise;
    }

    globalWithPtyServicePromise.__vibecanvasPtyServicePromise = Promise.resolve(new PtyService()).catch((error) => {
      delete globalWithPtyServicePromise.__vibecanvasPtyServicePromise;
      throw error;
    });

    return globalWithPtyServicePromise.__vibecanvasPtyServicePromise;
  }

  list(workingDirectory: string): TPty[] {
    return [...this.#sessions.values()]
      .filter((session) => session.pty.cwd === workingDirectory)
      .map((session) => ({ ...session.pty }));
  }

  get(workingDirectory: string, ptyID: string): TPty | null {
    const session = this.#sessions.get(ptyID);
    if (!session) return null;
    if (session.pty.cwd !== workingDirectory) return null;
    return { ...session.pty };
  }

  async create(workingDirectory: string, body?: TPtyCreateBody): Promise<TPty> {
    const command = body?.command?.trim() || getDefaultShellCommand();
    const args = body?.args ? [...body.args] : [];
    const cwd = body?.cwd?.trim() || workingDirectory;
    const title = body?.title?.trim() || "Terminal";
    const size = normalizeSize(body?.size);
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const terminal = new Bun.Terminal({
      rows: size.rows,
      cols: size.cols,
      data: (_terminal, data) => {
        const session = this.#sessions.get(id);
        if (!session) return;
        this.#appendOutput(session, toUint8Array(data));
      },
      exit: () => {
        const session = this.#sessions.get(id);
        if (!session) return;
        if (session.pty.status === "running") {
          session.pty.status = "error";
          session.pty.updatedAt = Date.now();
        }
        this.#closeClients(session, 1000, "PTY closed");
      },
    });

    const proc = Bun.spawn([command, ...args], {
      cwd,
      env: {
        ...process.env,
        ...(body?.env ?? {}),
      },
      terminal,
    });

    const pty: TPty = {
      id,
      title,
      command,
      args,
      cwd,
      status: "running",
      pid: proc.pid,
      rows: size.rows,
      cols: size.cols,
      exitCode: null,
      signalCode: null,
      createdAt,
      updatedAt: createdAt,
    };

    const session: TPtySession = {
      pty,
      terminal,
      process: proc,
      chunks: [],
      cursor: 0,
      clients: new Map(),
    };

    this.#sessions.set(id, session);

    void proc.exited.then(() => {
      const activeSession = this.#sessions.get(id);
      if (!activeSession) return;
      activeSession.pty.status = "exited";
      activeSession.pty.exitCode = activeSession.process.exitCode ?? null;
      activeSession.pty.signalCode = activeSession.process.signalCode ?? null;
      activeSession.pty.updatedAt = Date.now();
      this.#closeClients(activeSession, 1000, "PTY exited");
    }).catch(() => {
      const activeSession = this.#sessions.get(id);
      if (!activeSession) return;
      activeSession.pty.status = "error";
      activeSession.pty.updatedAt = Date.now();
      this.#closeClients(activeSession, 1011, "PTY failed");
    });

    return { ...pty };
  }

  update(workingDirectory: string, ptyID: string, body: TPtyUpdateBody): TPty | null {
    const session = this.#sessions.get(ptyID);
    if (!session) return null;
    if (session.pty.cwd !== workingDirectory) return null;

    if (typeof body.title === "string") {
      session.pty.title = body.title;
    }

    if (body.size) {
      const size = normalizeSize(body.size);
      session.terminal.resize(size.cols, size.rows);
      session.pty.rows = size.rows;
      session.pty.cols = size.cols;
    }

    session.pty.updatedAt = Date.now();
    return { ...session.pty };
  }

  async remove(workingDirectory: string, ptyID: string): Promise<boolean> {
    const session = this.#sessions.get(ptyID);
    if (!session) return false;
    if (session.pty.cwd !== workingDirectory) return false;

    this.#sessions.delete(ptyID);
    await this.#destroySession(session, "Removed");
    return true;
  }

  attach(args: TPtyAttachArgs) {
    const session = this.#sessions.get(args.ptyID);
    if (!session) return null;
    if (session.pty.cwd !== args.workingDirectory) return null;

    const clientId = crypto.randomUUID();
    const client: TPtyClient = {
      id: clientId,
      send: args.send,
      close: args.close,
    };

    session.clients.set(clientId, client);
    this.#replay(session, client, args.cursor ?? 0);

    if (session.pty.status !== "running") {
      queueMicrotask(() => client.close?.(1000, "PTY exited"));
    }

    return {
      send: (payload: string | ArrayBuffer | ArrayBufferView) => {
        const activeSession = this.#sessions.get(args.ptyID);
        if (!activeSession) return;
        if (activeSession.pty.status !== "running") return;

        if (typeof payload === "string") {
          activeSession.terminal.write(payload);
          return;
        }

        const bytes = toWritableBytes(payload);
        activeSession.terminal.write(bytes);
      },
      detach: () => {
        const activeSession = this.#sessions.get(args.ptyID);
        if (!activeSession) return;
        activeSession.clients.delete(clientId);
      },
    };
  }

  async shutdown(reason = "Server shutdown"): Promise<void> {
    if (this.#shuttingDown) return;
    this.#shuttingDown = true;

    const sessions = [...this.#sessions.values()];
    this.#sessions.clear();
    await Promise.allSettled(sessions.map((session) => this.#destroySession(session, reason)));
  }

  #appendOutput(session: TPtySession, data: Uint8Array) {
    if (data.byteLength === 0) return;

    const start = session.cursor;
    session.cursor += data.byteLength;
    session.pty.updatedAt = Date.now();
    session.chunks.push({
      start,
      end: session.cursor,
      data,
    });

    let totalBytes = 0;
    for (let index = session.chunks.length - 1; index >= 0; index -= 1) {
      totalBytes += session.chunks[index]!.data.byteLength;
      if (totalBytes > MAX_REPLAY_BUFFER_BYTES) {
        session.chunks.splice(0, index + 1);
        break;
      }
    }

    for (const client of session.clients.values()) {
      client.send(data);
    }
  }

  #replay(session: TPtySession, client: TPtyClient, requestedCursor: number) {
    const cursor = Math.max(0, Math.floor(requestedCursor));

    for (const chunk of session.chunks) {
      if (chunk.end <= cursor) continue;
      if (cursor <= chunk.start) {
        client.send(chunk.data);
        continue;
      }

      const offset = cursor - chunk.start;
      client.send(chunk.data.subarray(offset));
    }
  }

  #closeClients(session: TPtySession, code: number, reason: string) {
    for (const client of session.clients.values()) {
      client.close?.(code, reason);
    }
    session.clients.clear();
  }

  async #destroySession(session: TPtySession, reason: string) {
    this.#closeClients(session, 1000, reason);

    try {
      session.process.kill("SIGTERM");
    } catch {
      // ignore
    }

    await Promise.race([
      session.process.exited.catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 150)),
    ]);

    try {
      if (session.pty.status === "running") {
        session.process.kill("SIGKILL");
      }
    } catch {
      // ignore
    }

    try {
      session.terminal.close();
    } catch {
      // ignore
    }
  }
}
