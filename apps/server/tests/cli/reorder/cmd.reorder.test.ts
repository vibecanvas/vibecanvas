import { afterEach, describe, expect, test } from "bun:test";
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from "../harness";

type TReorderJson = {
  ok: true;
  command: "canvas.reorder";
  action: "front" | "back" | "forward" | "backward";
  canvas: { id: string; name: string; automergeUrl: string; createdAt: string };
  matchedCount: number;
  matchedIds: string[];
  parentGroupId: string | null;
  beforeOrder: Array<{ id: string; zIndex: string; kind: "element" | "group" }>;
  afterOrder: Array<{ id: string; zIndex: string; kind: "element" | "group" }>;
  changedIds: string[];
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

describe("canvas CLI reorder", () => {
  test("brings explicit ids to front with deterministic before/after order", async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: "rect-a", zIndex: "z00000000" });
    const rectB = createRectElement({ id: "rect-b", zIndex: "z00000001" });
    const rectC = createRectElement({ id: "rect-c", zIndex: "z00000002" });
    const seeded = await context.seedCanvasFixture({
      name: "reorder-front-canvas",
      elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC },
    });

    const result = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", "rect-a", "--action", "front", "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TReorderJson>(result)).toMatchObject({
      ok: true,
      command: "canvas.reorder",
      action: "front",
      matchedCount: 1,
      matchedIds: ["rect-a"],
      parentGroupId: null,
      changedIds: ["rect-a", "rect-b", "rect-c"],
      beforeOrder: [
        { id: "rect-a", kind: "element" },
        { id: "rect-b", kind: "element" },
        { id: "rect-c", kind: "element" },
      ],
      afterOrder: [
        { id: "rect-b", kind: "element" },
        { id: "rect-c", kind: "element" },
        { id: "rect-a", kind: "element" },
      ],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rectB.id]?.zIndex).toBe("z00000000");
    expect(doc.elements[rectC.id]?.zIndex).toBe("z00000001");
    expect(doc.elements[rectA.id]?.zIndex).toBe("z00000002");
  });

  test("moves explicit ids backward one step inside the same parent", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "z00000000" });
    const rectA = createRectElement({ id: "rect-a", parentGroupId: parent.id, zIndex: "z00000000" });
    const rectB = createRectElement({ id: "rect-b", parentGroupId: parent.id, zIndex: "z00000001" });
    const rectC = createRectElement({ id: "rect-c", parentGroupId: parent.id, zIndex: "z00000002" });
    const seeded = await context.seedCanvasFixture({
      name: "reorder-backward-canvas",
      groups: { [parent.id]: parent },
      elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC },
    });

    const result = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", "rect-c", "--action", "backward", "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TReorderJson>(result)).toMatchObject({
      ok: true,
      command: "canvas.reorder",
      action: "backward",
      matchedCount: 1,
      matchedIds: ["rect-c"],
      parentGroupId: parent.id,
      beforeOrder: [
        { id: "rect-a", kind: "element" },
        { id: "rect-b", kind: "element" },
        { id: "rect-c", kind: "element" },
      ],
      afterOrder: [
        { id: "rect-a", kind: "element" },
        { id: "rect-c", kind: "element" },
        { id: "rect-b", kind: "element" },
      ],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rectA.id]?.zIndex).toBe("z00000000");
    expect(doc.elements[rectC.id]?.zIndex).toBe("z00000001");
    expect(doc.elements[rectB.id]?.zIndex).toBe("z00000002");
  });

  test("fails clearly on missing targets, mixed parents, invalid action, and no-op requests", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "z00000000" });
    const rectTop = createRectElement({ id: "rect-top", zIndex: "z00000000" });
    const rectNested = createRectElement({ id: "rect-nested", parentGroupId: parent.id, zIndex: "z00000000" });
    const rectFront = createRectElement({ id: "rect-front", zIndex: "z00000001" });
    const seeded = await context.seedCanvasFixture({
      name: "reorder-invalid-canvas",
      groups: { [parent.id]: parent },
      elements: { [rectTop.id]: rectTop, [rectNested.id]: rectNested, [rectFront.id]: rectFront },
    });

    const missingTarget = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", "missing-id", "--action", "front", "--json"]);
    expectExitCode(missingTarget, 1);
    expect(missingTarget.stdout).toBe("");
    expect(JSON.parse(missingTarget.stderr)).toMatchObject({
      ok: false,
      command: "canvas.reorder",
      code: "CANVAS_REORDER_TARGET_NOT_FOUND",
      message: `Target ids were not found in canvas '${seeded.canvas.name}': missing-id.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const mixedParents = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", rectTop.id, "--id", rectNested.id, "--action", "front", "--json"]);
    expectExitCode(mixedParents, 1);
    expect(mixedParents.stdout).toBe("");
    expect(JSON.parse(mixedParents.stderr)).toMatchObject({
      ok: false,
      command: "canvas.reorder",
      code: "CANVAS_REORDER_PARENT_MISMATCH",
      message: "All reordered ids must share the same direct parentGroupId.",
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const invalidAction = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", rectTop.id, "--action", "sideways", "--json"]);
    expectExitCode(invalidAction, 1);
    expect(invalidAction.stdout).toBe("");
    expect(JSON.parse(invalidAction.stderr)).toMatchObject({
      ok: false,
      command: "canvas.reorder",
      code: "CANVAS_REORDER_ACTION_INVALID",
      message: "Invalid --action 'sideways'. Expected one of: front, back, forward, backward.",
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const noop = await context.runCanvasCli(["reorder", "--canvas", seeded.canvas.id, "--id", rectFront.id, "--action", "front", "--json"]);
    expectExitCode(noop, 1);
    expect(noop.stdout).toBe("");
    expect(JSON.parse(noop.stderr)).toMatchObject({
      ok: false,
      command: "canvas.reorder",
      code: "CANVAS_REORDER_NO_OP",
      message: "Reorder would not change sibling order for the requested action.",
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });
  });
});
