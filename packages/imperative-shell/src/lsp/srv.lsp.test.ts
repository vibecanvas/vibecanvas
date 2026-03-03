import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";
import { EventEmitter } from "node:events";
import { LspService } from "./srv.lsp";
import { LspServerInfoByLanguage } from "./srv.lsp-server-info";

const tempDirs: string[] = [];
const activeServices: LspService[] = [];
const originalTypeScriptSpawn = LspServerInfoByLanguage.typescript.spawn;

function createTempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "vibecanvas-lsp-service-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (activeServices.length > 0) {
    const service = activeServices.pop();
    if (!service) continue;
    void service.shutdown();
  }

  LspServerInfoByLanguage.typescript.spawn = originalTypeScriptSpawn;

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    rmSync(dir, { recursive: true, force: true });
  }
});

function createService(workspace: string): LspService {
  const service = new LspService(workspace);
  activeServices.push(service);
  return service;
}

function createFakeServerHandle(pid = 1001) {
  const processEvents = new EventEmitter();
  const stdoutEvents = new EventEmitter();
  const writes: string[] = [];

  return {
    writes,
    process: {
      pid,
      stdin: {
        write(chunk: string) {
          writes.push(chunk);
          return true;
        },
      },
      stdout: {
        setEncoding() {
          return;
        },
        on(event: string, listener: (...args: unknown[]) => void) {
          stdoutEvents.on(event, listener);
          return this;
        },
      },
      on(event: string, listener: (...args: unknown[]) => void) {
        processEvents.on(event, listener);
        return this;
      },
      kill() {
        return true;
      },
    },
    emitStdout(data: string) {
      stdoutEvents.emit("data", data);
    },
  };
}

describe("LspService openChannel idempotency", () => {
  test("returns true and keeps attachment when target is unchanged", () => {
    const workspace = createTempWorkspace();
    const service = createService(workspace);
    const anyService = service as any;

    const requestId = "req-1";
    const clientId = "client-1";
    const filePath = join(workspace, "project", "src", "index.ts");
    const sessionKey = anyService.toSessionKey("typescript", join(workspace, "project"));
    const attachmentKey = anyService.attachmentKey({ requestId, clientId });

    anyService.sessions.set(sessionKey, {
      key: sessionKey,
      language: "typescript",
      projectRoot: join(workspace, "project"),
      attachedClients: new Set([attachmentKey]),
      pid: 123,
      idleSince: null,
    });
    anyService.attachments.set(attachmentKey, {
      requestId,
      clientId,
      sessionKey,
      language: "typescript",
      filePath,
    });

    const result = anyService.handleOpenChannelIdempotency({
      requestId,
      clientId,
      language: "typescript",
      filePath,
    });

    expect(result).toBe(true);
    expect(anyService.attachments.get(attachmentKey)).toBeDefined();
    expect(anyService.sessions.get(sessionKey).attachedClients.has(attachmentKey)).toBe(true);
  });

  test("returns false and detaches old attachment when target changed", () => {
    const workspace = createTempWorkspace();
    const service = createService(workspace);
    const anyService = service as any;

    const requestId = "req-2";
    const clientId = "client-2";
    const oldFilePath = join(workspace, "project", "src", "old.ts");
    const newFilePath = join(workspace, "project", "src", "new.ts");
    const sessionKey = anyService.toSessionKey("typescript", join(workspace, "project"));
    const attachmentKey = anyService.attachmentKey({ requestId, clientId });

    anyService.sessions.set(sessionKey, {
      key: sessionKey,
      language: "typescript",
      projectRoot: join(workspace, "project"),
      attachedClients: new Set([attachmentKey]),
      pid: 456,
      idleSince: null,
    });
    anyService.attachments.set(attachmentKey, {
      requestId,
      clientId,
      sessionKey,
      language: "typescript",
      filePath: oldFilePath,
    });

    const result = anyService.handleOpenChannelIdempotency({
      requestId,
      clientId,
      language: "typescript",
      filePath: newFilePath,
    });

    expect(result).toBe(false);
    expect(anyService.attachments.has(attachmentKey)).toBe(false);
    expect(anyService.sessions.get(sessionKey).attachedClients.has(attachmentKey)).toBe(false);
  });
});

describe("LspService root resolution", () => {
  test("uses rootHint when it contains filePath", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const sourceDir = join(projectRoot, "src");
    const filePath = join(sourceDir, "index.ts");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "export const x = 1", "utf8");

    const service = createService(workspace);
    const resolved = await (service as any).resolveProjectRoot({
      requestId: "req-3",
      clientId: "client-3",
      language: "typescript",
      filePath,
      rootHint: projectRoot,
    });

    expect(resolved).toBe(normalize(projectRoot));
  });

  test("ignores invalid rootHint and uses detected root", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const sourceDir = join(projectRoot, "src");
    const invalidHint = join(workspace, "other-root");
    const filePath = join(sourceDir, "index.ts");
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(invalidHint, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "export const x = 1", "utf8");

    const service = createService(workspace);
    const resolved = await (service as any).resolveProjectRoot({
      requestId: "req-4",
      clientId: "client-4",
      language: "typescript",
      filePath,
      rootHint: invalidHint,
    });

    expect(resolved).toBe(normalize(projectRoot));
  });
});

describe("LspService session reuse", () => {
  test("reuses same session and increments attached client count", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const srcDir = join(projectRoot, "src");
    const filePath = join(srcDir, "index.ts");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "export const x = 1", "utf8");

    let spawnCount = 0;
    LspServerInfoByLanguage.typescript.spawn = async () => {
      spawnCount += 1;
      const fake = createFakeServerHandle(2000 + spawnCount);
      return { process: fake.process as any };
    };

    const service = createService(workspace);
    await service.openChannel({ requestId: "req-a", clientId: "client-a", language: "typescript", filePath });
    await service.openChannel({ requestId: "req-b", clientId: "client-b", language: "typescript", filePath });

    const sessions = service.listSessions();
    expect(spawnCount).toBe(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].attachedClients).toBe(2);
  });
});

describe("LspService request id remap", () => {
  test("maps upstream response id back to original client id", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const srcDir = join(projectRoot, "src");
    const filePath = join(srcDir, "index.ts");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "export const x = 1", "utf8");

    const fake = createFakeServerHandle(3001);
    LspServerInfoByLanguage.typescript.spawn = async () => {
      return { process: fake.process as any };
    };

    const service = createService(workspace);
    const outbound: Array<{ requestId: string; clientId: string; message: string }> = [];
    service.setOutboundSender((payload) => outbound.push(payload));

    await service.openChannel({ requestId: "req-c", clientId: "client-c", language: "typescript", filePath });
    service.handleClientMessage({
      requestId: "req-c",
      clientId: "client-c",
      message: JSON.stringify({ jsonrpc: "2.0", id: "cm-1", method: "textDocument/hover", params: {} }),
    });

    expect(fake.writes.length).toBeGreaterThan(0);
    const anyService = service as any;
    const upstreamId = Array.from(anyService.requestMap.keys())[0] as number;
    expect(typeof upstreamId).toBe("number");

    const response = JSON.stringify({ jsonrpc: "2.0", id: upstreamId, result: { ok: true } });
    const framed = `Content-Length: ${Buffer.byteLength(response, "utf8")}\r\n\r\n${response}`;
    fake.emitStdout(framed);

    const routed = outbound.find((x) => x.requestId === "req-c" && x.clientId === "client-c" && x.message.includes('"result"'));
    expect(routed).toBeDefined();
    const routedMessage = JSON.parse(routed!.message) as { id: string };
    expect(routedMessage.id).toBe("cm-1");
  });
});

describe("LspService closeAllForRequest", () => {
  test("detaches only channels for the given requestId", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const srcDir = join(projectRoot, "src");
    const filePath = join(srcDir, "index.ts");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "export const x = 1", "utf8");

    LspServerInfoByLanguage.typescript.spawn = async () => {
      const fake = createFakeServerHandle(4001);
      return { process: fake.process as any };
    };

    const service = createService(workspace);
    await service.openChannel({ requestId: "req-x", clientId: "client-x", language: "typescript", filePath });
    await service.openChannel({ requestId: "req-y", clientId: "client-y", language: "typescript", filePath });

    service.closeAllForRequest("req-x");

    const anyService = service as any;
    const keyX = anyService.attachmentKey({ requestId: "req-x", clientId: "client-x" });
    const keyY = anyService.attachmentKey({ requestId: "req-y", clientId: "client-y" });

    expect(anyService.attachments.has(keyX)).toBe(false);
    expect(anyService.attachments.has(keyY)).toBe(true);
    expect(service.listSessions()[0].attachedClients).toBe(1);
  });
});
