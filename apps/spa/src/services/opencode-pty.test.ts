import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const storage = new Map<string, string>();

vi.mock("@/services/orpc-websocket", () => ({
  orpcWebsocketService: {
    client: {
      api: {
        opencode: {
          pty: {
            list: vi.fn(),
            create: vi.fn(),
            get: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
          },
        },
      },
    },
  },
}));

type THelpers = typeof import("./opencode-pty");
let helpers: THelpers;

beforeAll(async () => {
  vi.stubGlobal("window", {
    location: {
      protocol: "http:",
      host: "localhost:3001",
    },
  });

  vi.stubGlobal("localStorage", {
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
  });

  helpers = await import("./opencode-pty");
});

describe("opencode-pty service helpers", () => {
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

    const encoded = new TextEncoder().encode('{"state":{"cursor":99}}').buffer;
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

  test("buildPtyWebSocketUrl includes chat and cursor params", () => {
    const url = helpers.buildPtyWebSocketUrl({ workingDirectory: "/Users/test/project", ptyID: "pty/1", cursor: 55 });
    expect(url).toBe("ws://localhost:3001/api/opencode/pty/pty%2F1/connect?workingDirectory=%2FUsers%2Ftest%2Fproject&cursor=55");
  });

});
