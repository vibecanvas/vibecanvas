import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const storage = new Map<string, string>();

type THelpers = typeof import("../../../src/services/terminal/pty");
let helpers: THelpers;

beforeAll(async () => {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        protocol: "http:",
        host: "localhost:3001",
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
    configurable: true,
  });

  helpers = await import("../../../src/services/terminal/pty");
});

describe("pty service helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("extractCursorFromJson reads nested cursor", () => {
    expect(helpers.extractCursorFromJson({ data: { cursor: 12.9 } })).toBe(12);
    expect(helpers.extractCursorFromJson({ payload: { meta: { cursor: 3 } } })).toBe(3);
    expect(helpers.extractCursorFromJson({ nope: true })).toBeNull();
  });

  test("extractCursorFromMessageData handles string and arraybuffer payloads", () => {
    expect(helpers.extractCursorFromMessageData('{"cursor":7}')).toBe(7);

    const encoded = new TextEncoder().encode('{"state":{"cursor":99}}');
    expect(helpers.extractCursorFromMessageData(encoded)).toBe(99);
  });

  test("extractCursorFromControlFrame reads control frame payload", () => {
    const payload = new TextEncoder().encode('{"cursor":123}');
    const frame = new Uint8Array(payload.length + 1);
    frame[0] = 0;
    frame.set(payload, 1);
    expect(helpers.extractCursorFromControlFrame(frame)).toBe(123);
  });

  test("session state roundtrip persists and restores", () => {
    helpers.saveTerminalSessionState({
      terminalKey: "terminal-1",
      workingDirectory: "/Users/test/project",
      ptyID: "pty-1",
      cursor: 18,
      rows: 40,
      cols: 120,
      title: "Terminal",
    });

    const restored = helpers.loadTerminalSessionState("terminal-1");
    expect(restored).toEqual({
      terminalKey: "terminal-1",
      workingDirectory: "/Users/test/project",
      ptyID: "pty-1",
      cursor: 18,
      rows: 40,
      cols: 120,
      title: "Terminal",
    });
  });

  test("buildPtyWebSocketUrl includes working directory and cursor params", () => {
    const url = helpers.buildPtyWebSocketUrl({ workingDirectory: "/Users/test/project", ptyID: "pty/1", cursor: 55 });
    expect(url).toBe("ws://localhost:3001/api/pty/pty%2F1/connect?workingDirectory=%2FUsers%2Ftest%2Fproject&cursor=55");
  });

  test("createPtyService forwards through injected safe client", async () => {
    const safeClient = {
      api: {
        pty: {
          list: vi.fn().mockResolvedValue([null, []]),
          create: vi.fn().mockResolvedValue([null, { id: "pty-1" }]),
          get: vi.fn().mockResolvedValue([null, { id: "pty-1" }]),
          update: vi.fn().mockResolvedValue([null, { id: "pty-1" }]),
          remove: vi.fn().mockResolvedValue([null, { ok: true }]),
        },
      },
    } as any;

    const service = helpers.createPtyService(safeClient);

    await service.list("/tmp/demo");
    await service.create("/tmp/demo", { title: "Terminal" });
    await service.get("/tmp/demo", "pty-1");
    await service.update("/tmp/demo", "pty-1", { size: { rows: 24, cols: 80 } });
    await service.remove("/tmp/demo", "pty-1");

    expect(safeClient.api.pty.list).toHaveBeenCalledWith({ workingDirectory: "/tmp/demo" });
    expect(safeClient.api.pty.create).toHaveBeenCalledWith({ workingDirectory: "/tmp/demo", body: { title: "Terminal" } });
    expect(safeClient.api.pty.get).toHaveBeenCalledWith({ workingDirectory: "/tmp/demo", path: { ptyID: "pty-1" } });
    expect(safeClient.api.pty.update).toHaveBeenCalledWith({
      workingDirectory: "/tmp/demo",
      path: { ptyID: "pty-1" },
      body: { size: { rows: 24, cols: 80 } },
    });
    expect(safeClient.api.pty.remove).toHaveBeenCalledWith({ workingDirectory: "/tmp/demo", path: { ptyID: "pty-1" } });
  });
});
