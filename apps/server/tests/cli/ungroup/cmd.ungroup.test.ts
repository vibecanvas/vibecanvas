import { afterEach, describe, expect, test } from "bun:test";
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from "../harness";

type TUngroupJson = {
  ok: true;
  command: "canvas.ungroup";
  canvas: { id: string; name: string; automergeUrl: string; createdAt: string };
  matchedCount: number;
  matchedIds: string[];
  removedGroupCount: number;
  removedGroupIds: string[];
  releasedChildCount: number;
  releasedChildIds: string[];
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

describe("canvas CLI ungroup", () => {
  test("ungroups one explicit group id and preserves absolute child positions", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "a0" });
    const group = createGroup({ id: "group-target", parentGroupId: parent.id, zIndex: "a1" });
    const rectA = createRectElement({ id: "rect-a", x: 40, y: 60, parentGroupId: group.id, zIndex: "a2", updatedAt: 10 });
    const rectB = createRectElement({ id: "rect-b", x: 140, y: 160, parentGroupId: group.id, zIndex: "a3", updatedAt: 20 });
    const sibling = createRectElement({ id: "rect-sibling", x: 400, y: 500, parentGroupId: parent.id, zIndex: "a4" });
    const seeded = await context.seedCanvasFixture({
      name: "ungroup-one-canvas",
      groups: { [parent.id]: parent, [group.id]: group },
      elements: { [rectA.id]: rectA, [rectB.id]: rectB, [sibling.id]: sibling },
    });

    const result = await context.runCanvasCli(["ungroup", "--canvas", seeded.canvas.id, "--id", group.id, "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TUngroupJson>(result)).toMatchObject({
      ok: true,
      command: "canvas.ungroup",
      matchedCount: 1,
      matchedIds: ["group-target"],
      removedGroupCount: 1,
      removedGroupIds: ["group-target"],
      releasedChildCount: 2,
      releasedChildIds: ["rect-a", "rect-b"],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[group.id]).toBeUndefined();
    expect(doc.elements[rectA.id]?.parentGroupId).toBe(parent.id);
    expect(doc.elements[rectB.id]?.parentGroupId).toBe(parent.id);
    expect(doc.elements[rectA.id]?.x).toBe(40);
    expect(doc.elements[rectA.id]?.y).toBe(60);
    expect(doc.elements[rectB.id]?.x).toBe(140);
    expect(doc.elements[rectB.id]?.y).toBe(160);
    expect(doc.elements[sibling.id]?.parentGroupId).toBe(parent.id);
  });

  test("ungroups multiple explicit group ids and releases direct child elements to each parent", async () => {
    const context = await createContext();
    const parentA = createGroup({ id: "group-parent-a", zIndex: "a0" });
    const parentB = createGroup({ id: "group-parent-b", zIndex: "a1" });
    const groupB = createGroup({ id: "group-b", parentGroupId: parentB.id, zIndex: "a3" });
    const groupA = createGroup({ id: "group-a", parentGroupId: parentA.id, zIndex: "a2" });
    const rectA = createRectElement({ id: "rect-a", x: 10, y: 20, parentGroupId: groupA.id, zIndex: "a4" });
    const rectB = createRectElement({ id: "rect-b", x: 30, y: 40, parentGroupId: groupB.id, zIndex: "a5" });
    const seeded = await context.seedCanvasFixture({
      name: "ungroup-many-canvas",
      groups: { [parentA.id]: parentA, [parentB.id]: parentB, [groupA.id]: groupA, [groupB.id]: groupB },
      elements: { [rectA.id]: rectA, [rectB.id]: rectB },
    });

    const result = await context.runCanvasCli(["ungroup", "--canvas", seeded.canvas.id, "--id", groupB.id, "--id", groupA.id, "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TUngroupJson>(result)).toMatchObject({
      ok: true,
      command: "canvas.ungroup",
      matchedCount: 2,
      matchedIds: ["group-a", "group-b"],
      removedGroupCount: 2,
      removedGroupIds: ["group-a", "group-b"],
      releasedChildCount: 2,
      releasedChildIds: ["rect-a", "rect-b"],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[groupA.id]).toBeUndefined();
    expect(doc.groups[groupB.id]).toBeUndefined();
    expect(doc.elements[rectA.id]?.parentGroupId).toBe(parentA.id);
    expect(doc.elements[rectB.id]?.parentGroupId).toBe(parentB.id);
    expect(doc.elements[rectA.id]?.x).toBe(10);
    expect(doc.elements[rectB.id]?.y).toBe(40);
  });

  test("fails clearly on missing targets and non-group ids", async () => {
    const context = await createContext();
    const parent = createGroup({ id: "group-parent", zIndex: "a0" });
    const group = createGroup({ id: "group-target", parentGroupId: parent.id, zIndex: "a1" });
    const rect = createRectElement({ id: "rect-a", parentGroupId: group.id, zIndex: "a2" });
    const topLevel = createRectElement({ id: "rect-top", zIndex: "a3" });
    const seeded = await context.seedCanvasFixture({
      name: "ungroup-invalid-canvas",
      groups: { [parent.id]: parent, [group.id]: group },
      elements: { [rect.id]: rect, [topLevel.id]: topLevel },
    });

    const missingTarget = await context.runCanvasCli(["ungroup", "--canvas", seeded.canvas.id, "--id", "missing-id", "--json"]);
    expectExitCode(missingTarget, 1);
    expect(missingTarget.stdout).toBe("");
    expect(JSON.parse(missingTarget.stderr)).toMatchObject({
      ok: false,
      command: "canvas.ungroup",
      code: "CANVAS_UNGROUP_TARGET_NOT_FOUND",
      message: `Target ids were not found in canvas '${seeded.canvas.name}': missing-id.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const nonGroup = await context.runCanvasCli(["ungroup", "--canvas", seeded.canvas.id, "--id", topLevel.id, "--json"]);
    expectExitCode(nonGroup, 1);
    expect(nonGroup.stdout).toBe("");
    expect(JSON.parse(nonGroup.stderr)).toMatchObject({
      ok: false,
      command: "canvas.ungroup",
      code: "CANVAS_UNGROUP_TARGET_KIND_INVALID",
      message: `Ungroup currently supports group ids only. Received element ids: ${topLevel.id}.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });
  });
});
