import { afterEach, describe, expect, test } from "bun:test";
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from "../harness";

type TGroupJson = {
  ok: true;
  command: "canvas.group";
  canvas: { id: string; name: string; automergeUrl: string; createdAt: string };
  matchedCount: number;
  matchedIds: string[];
  group: {
    id: string;
    parentGroupId: string | null;
    childIds: string[];
  };
};

const contexts: TCliTestContext[] = [];

afterEach(async () => {
  while (contexts.length > 0) {
    await contexts.pop()?.cleanup();
  }
});

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  contexts.push(context);
  return context;
}

describe("canvas CLI group", () => {
  test("groups explicit top-level element ids and preserves absolute positions", async () => {
    const context = await createContext();
    const rectB = createRectElement({ id: "rect-b", x: 150, y: 70, zIndex: "a1", createdAt: 20, updatedAt: 20 });
    const rectA = createRectElement({ id: "rect-a", x: 40, y: 30, zIndex: "a0", createdAt: 10, updatedAt: 10 });
    const outside = createRectElement({ id: "rect-outside", x: 600, y: 500, zIndex: "a2" });
    const seeded = await context.seedCanvasFixture({
      name: "group-top-level-canvas",
      elements: { [rectB.id]: rectB, [rectA.id]: rectA, [outside.id]: outside },
    });

    const result = await context.runCanvasCli(["group", "--canvas", seeded.canvas.id, "--id", rectB.id, "--id", rectA.id, "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TGroupJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: "canvas.group",
      matchedCount: 2,
      matchedIds: ["rect-a", "rect-b"],
      group: {
        parentGroupId: null,
        childIds: ["rect-a", "rect-b"],
      },
    });
    expect(typeof payload.group.id).toBe("string");
    expect(payload.group.id.length).toBeGreaterThan(0);

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rectA.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[rectB.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[rectA.id]?.x).toBe(40);
    expect(doc.elements[rectA.id]?.y).toBe(30);
    expect(doc.elements[rectB.id]?.x).toBe(150);
    expect(doc.elements[rectB.id]?.y).toBe(70);
    expect(doc.elements[outside.id]?.parentGroupId).toBeNull();
    expect(doc.groups[payload.group.id]).toMatchObject({
      id: payload.group.id,
      parentGroupId: null,
    });
  });

  test("groups explicit ids inside one parent group and keeps nested child positions unchanged", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "a0", createdAt: 1 });
    const rectA = createRectElement({ id: "rect-a", x: 20, y: 40, parentGroupId: parent.id, zIndex: "a1" });
    const rectB = createRectElement({ id: "rect-b", x: 80, y: 140, parentGroupId: parent.id, zIndex: "a2" });
    const sibling = createRectElement({ id: "rect-sibling", x: 300, y: 320, parentGroupId: parent.id, zIndex: "a3" });
    const seeded = await context.seedCanvasFixture({
      name: "group-nested-canvas",
      groups: { [parent.id]: parent },
      elements: { [rectA.id]: rectA, [rectB.id]: rectB, [sibling.id]: sibling },
    });

    const result = await context.runCanvasCli(["group", "--canvas", seeded.canvas.id, "--id", rectB.id, "--id", rectA.id, "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TGroupJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: "canvas.group",
      matchedCount: 2,
      matchedIds: ["rect-a", "rect-b"],
      group: {
        parentGroupId: parent.id,
        childIds: ["rect-a", "rect-b"],
      },
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[payload.group.id]?.parentGroupId).toBe(parent.id);
    expect(doc.elements[rectA.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[rectB.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[rectA.id]?.x).toBe(20);
    expect(doc.elements[rectA.id]?.y).toBe(40);
    expect(doc.elements[rectB.id]?.x).toBe(80);
    expect(doc.elements[rectB.id]?.y).toBe(140);
    expect(doc.elements[sibling.id]?.parentGroupId).toBe(parent.id);
  });

  test("fails clearly on missing targets, mixed parents, and group ids", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "a0" });
    const existingGroup = createGroup({ id: "group-existing", zIndex: "a1" });
    const topLevel = createRectElement({ id: "rect-top", x: 10, y: 20, zIndex: "a2" });
    const nested = createRectElement({ id: "rect-nested", x: 30, y: 40, parentGroupId: parent.id, zIndex: "a3" });
    const seeded = await context.seedCanvasFixture({
      name: "group-invalid-canvas",
      groups: { [parent.id]: parent, [existingGroup.id]: existingGroup },
      elements: { [topLevel.id]: topLevel, [nested.id]: nested },
    });

    const missingTarget = await context.runCanvasCli(["group", "--canvas", seeded.canvas.id, "--id", topLevel.id, "--id", "missing-id", "--json"]);
    expectExitCode(missingTarget, 1);
    expect(missingTarget.stdout).toBe("");
    expect(JSON.parse(missingTarget.stderr)).toMatchObject({
      ok: false,
      command: "canvas.group",
      code: "CANVAS_GROUP_TARGET_NOT_FOUND",
      message: `Target ids were not found in canvas '${seeded.canvas.name}': missing-id.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const mixedParents = await context.runCanvasCli(["group", "--canvas", seeded.canvas.id, "--id", topLevel.id, "--id", nested.id, "--json"]);
    expectExitCode(mixedParents, 1);
    expect(mixedParents.stdout).toBe("");
    expect(JSON.parse(mixedParents.stderr)).toMatchObject({
      ok: false,
      command: "canvas.group",
      code: "CANVAS_GROUP_PARENT_MISMATCH",
      message: "All grouped ids must share the same direct parentGroupId.",
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const includesGroup = await context.runCanvasCli(["group", "--canvas", seeded.canvas.id, "--id", topLevel.id, "--id", existingGroup.id, "--json"]);
    expectExitCode(includesGroup, 1);
    expect(includesGroup.stdout).toBe("");
    expect(JSON.parse(includesGroup.stderr)).toMatchObject({
      ok: false,
      command: "canvas.group",
      code: "CANVAS_GROUP_TARGET_KIND_INVALID",
      message: `Grouping currently supports element ids only. Received group ids: ${existingGroup.id}.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });
  });
});
