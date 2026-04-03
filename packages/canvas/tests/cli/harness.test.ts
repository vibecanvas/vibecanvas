// @vitest-environment node

import { access } from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import {
  createCliTestContext,
  createGroup,
  createRectElement,
  expectExitCode,
  expectNoStderr,
  parseJsonStdout,
  type TCliTestContext,
} from "./harness";

const activeContexts = new Set<TCliTestContext>();

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  activeContexts.add(context);
  return context;
}

afterEach(async () => {
  for (const context of activeContexts) {
    await context.cleanup();
  }

  activeContexts.clear();
});

describe("canvas CLI test harness", () => {
  test("creates a brand-new migrated sqlite sandbox for every test context", async () => {
    const first = await createContext();
    const second = await createContext();

    expect(first.tempRoot).not.toBe(second.tempRoot);
    expect(first.dbPath).not.toBe(second.dbPath);
    await expect(access(first.dbPath)).resolves.toBeUndefined();
    await expect(access(second.dbPath)).resolves.toBeUndefined();
    expect(await first.listCanvases()).toEqual([]);
    expect(await second.listCanvases()).toEqual([]);
  });

  test("seeds isolated canvas rows and persisted automerge docs for future CLI tests", async () => {
    const context = await createContext();
    const rect = createRectElement({ id: "rect-1", x: 40, y: 80, zIndex: "a1" });
    const group = createGroup({ id: "group-1", zIndex: "a2" });
    const seeded = await context.seedCanvasFixture({
      name: "cli-seeded-canvas",
      elements: { [rect.id]: rect },
      groups: { [group.id]: group },
    });

    const rows = await context.listCanvases();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(seeded.canvas.id);
    expect(rows[0]?.name).toBe("cli-seeded-canvas");

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.name).toBe("cli-seeded-canvas");
    expect(doc.elements[rect.id]?.x).toBe(40);
    expect(doc.elements[rect.id]?.y).toBe(80);
    expect(doc.groups[group.id]?.id).toBe(group.id);
  });

  test("standardizes subprocess assertions for exit code stdout stderr and json payloads", async () => {
    const context = await createContext();
    const result = await context.runProcess({
      cmd: [
        "bun",
        "-e",
        'console.log(JSON.stringify({ ok: true, value: 7 })); console.error("warn"); process.exit(3)',
      ],
    });

    expectExitCode(result, 3);
    expect(result.stderr).toContain("warn");

    const payload = parseJsonStdout<{ ok: boolean; value: number }>(result);
    expect(payload).toEqual({ ok: true, value: 7 });
  });

  test("runs the real vibecanvas CLI entry point end to end", async () => {
    const context = await createContext();
    const result = await context.runVibecanvasCli(["--help"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("Commands:");
  });

  test("runs the real canvas CLI path with explicit isolated --db wiring", async () => {
    const context = await createContext();
    const result = await context.runCanvasCli(["list", "--json"]);

    expectExitCode(result, 1);
    expect(result.stdout).toContain("[DB] Applying migrations from");

    const payload = JSON.parse(result.stderr) as {
      ok: boolean;
      command: string;
      code: string;
      dbPath: string;
      message: string;
    };

    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("canvas");
    expect(payload.code).toBe("CANVAS_COMMAND_NOT_IMPLEMENTED");
    expect(payload.dbPath).toBe(context.dbPath);
    expect(payload.message).toContain("not implemented");
  });
});
