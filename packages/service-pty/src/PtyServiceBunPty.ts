import { spawn, type IDisposable, type IPty } from 'bun-pty';
import type { IPtyService } from './IPtyService';
import type {
  TPty,
  TPtyAttachArgs,
  TPtyAttachment,
  TPtyCreateBody,
  TPtyUpdateBody,
} from './types';

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
  terminal: IPty;
  onDataSubscription: IDisposable;
  onExitSubscription: IDisposable;
  exited: Promise<void>;
  chunks: TPtyChunk[];
  cursor: number;
  clients: Map<string, TPtyClient>;
};

const DEFAULT_ROWS = 24;
const DEFAULT_COLS = 80;
const MAX_REPLAY_BUFFER_BYTES = 1024 * 1024 * 4;

function normalizeSize(size?: { rows: number; cols: number }) {
  return {
    rows: Math.max(1, Math.floor(size?.rows ?? DEFAULT_ROWS)),
    cols: Math.max(1, Math.floor(size?.cols ?? DEFAULT_COLS)),
  };
}

function toUint8Array(data: Uint8Array<ArrayBuffer> | string): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

function getDefaultShellCommand(): string {
  return process.env.SHELL || '/bin/bash';
}

function toWritableBytes(payload: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
}

function toWritableText(payload: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof payload === 'string') return payload;
  return new TextDecoder().decode(toWritableBytes(payload));
}

function toSpawnEnv(overrides?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue;
    env[key] = value;
  }

  if (!overrides) return env;

  for (const [key, value] of Object.entries(overrides)) {
    env[key] = value;
  }

  return env;
}

export class PtyServiceBunPty implements IPtyService {
  readonly name = 'pty' as const;

  #sessions = new Map<string, TPtySession>();
  #stopPromise: Promise<void> | null = null;
  #stopped = false;

  list(_filesystemId: string, workingDirectory: string): TPty[] {
    return [...this.#sessions.values()]
      .filter((session) => session.pty.cwd === workingDirectory)
      .map((session) => ({ ...session.pty }));
  }

  get(_filesystemId: string, workingDirectory: string, ptyID: string): TPty | null {
    const session = this.#sessions.get(ptyID);
    if (!session) return null;
    if (session.pty.cwd !== workingDirectory) return null;
    return { ...session.pty };
  }

  async create(_filesystemId: string, workingDirectory: string, body?: TPtyCreateBody): Promise<TPty> {
    if (this.#stopped) {
      throw new Error('PTY service has been stopped');
    }

    const command = body?.command?.trim() || getDefaultShellCommand();
    const args = body?.args ? [...body.args] : [];
    const cwd = body?.cwd?.trim() || workingDirectory;
    const title = body?.title?.trim() || 'Terminal';
    const size = normalizeSize(body?.size);
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const env = toSpawnEnv(body?.env);

    const terminal = spawn(command, args, {
      name: env.TERM || 'xterm-256color',
      cols: size.cols,
      rows: size.rows,
      cwd,
      env,
    });

    let resolveExited!: () => void;
    const exited = new Promise<void>((resolve) => {
      resolveExited = resolve;
    });

    const onDataSubscription = terminal.onData((data) => {
      const session = this.#sessions.get(id);
      if (!session) return;
      this.#appendOutput(session, toUint8Array(data));
    });

    const onExitSubscription = terminal.onExit((event) => {
      const session = this.#sessions.get(id);
      resolveExited();
      if (!session) return;

      session.pty.status = 'exited';
      session.pty.exitCode = typeof event.exitCode === 'number' ? event.exitCode : null;
      session.pty.signalCode = typeof event.signal === 'string'
        ? event.signal
        : typeof event.signal === 'number'
          ? `${event.signal}`
          : null;
      session.pty.updatedAt = Date.now();
      this.#closeClients(session, 1000, 'PTY exited');
    });

    const pty: TPty = {
      id,
      title,
      command,
      args,
      cwd,
      status: 'running',
      pid: terminal.pid,
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
      onDataSubscription,
      onExitSubscription,
      exited,
      chunks: [],
      cursor: 0,
      clients: new Map(),
    };

    this.#sessions.set(id, session);

    return { ...pty };
  }

  update(_filesystemId: string, workingDirectory: string, ptyID: string, body: TPtyUpdateBody): TPty | null {
    const session = this.#sessions.get(ptyID);
    if (!session) return null;
    if (session.pty.cwd !== workingDirectory) return null;

    if (typeof body.title === 'string') {
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

  async remove(_filesystemId: string, workingDirectory: string, ptyID: string): Promise<boolean> {
    const session = this.#sessions.get(ptyID);
    if (!session) return false;
    if (session.pty.cwd !== workingDirectory) return false;

    this.#sessions.delete(ptyID);
    await this.#destroySession(session, 'Removed');
    return true;
  }

  attach(args: TPtyAttachArgs): TPtyAttachment | null {
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

    if (session.pty.status !== 'running') {
      queueMicrotask(() => client.close?.(1000, 'PTY exited'));
    }

    return {
      send: (payload: string | ArrayBuffer | ArrayBufferView) => {
        const activeSession = this.#sessions.get(args.ptyID);
        if (!activeSession) return;
        if (activeSession.pty.status !== 'running') return;
        activeSession.terminal.write(toWritableText(payload));
      },
      detach: () => {
        const activeSession = this.#sessions.get(args.ptyID);
        if (!activeSession) return;
        activeSession.clients.delete(clientId);
      },
    };
  }

  stop(): Promise<void> {
    return this.shutdown('Service stop');
  }

  async shutdown(reason = 'Service stop'): Promise<void> {
    if (this.#stopPromise) return this.#stopPromise;

    this.#stopped = true;
    this.#stopPromise = (async () => {
      const sessions = [...this.#sessions.values()];
      this.#sessions.clear();
      await Promise.allSettled(sessions.map((session) => this.#destroySession(session, reason)));
    })();

    return this.#stopPromise;
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
      session.terminal.kill('SIGTERM');
    } catch {
      // ignore
    }

    await Promise.race([
      session.exited.catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 150)),
    ]);

    try {
      if (session.pty.status === 'running') {
        session.terminal.kill('SIGKILL');
      }
    } catch {
      // ignore
    }

    try {
      session.onDataSubscription.dispose();
      session.onExitSubscription.dispose();
    } catch {
      // ignore
    }
  }
}
