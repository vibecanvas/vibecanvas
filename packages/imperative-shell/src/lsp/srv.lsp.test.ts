import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";
import { LspService } from "./srv.lsp";

const tempDirs: string[] = [];

function createTempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "vibecanvas-lsp-service-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("LspService openChannel idempotency", () => {
  test("returns true and keeps attachment when target is unchanged", () => {
    const workspace = createTempWorkspace();
    const service = new LspService(workspace);
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
    const service = new LspService(workspace);
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

    const service = new LspService(workspace);
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

    const service = new LspService(workspace);
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
