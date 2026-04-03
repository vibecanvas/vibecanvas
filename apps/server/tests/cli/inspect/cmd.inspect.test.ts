import { afterEach, describe, expect, test } from "bun:test";
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from "../harness";

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

describe("canvas CLI inspect", () => {
  test("inspects one element by exact id inside a selected canvas", async () => {
    const context = await createContext();
    const group = createGroup({ id: "group-root", zIndex: "a0" });
    const element = createRectElement({
      id: "rect-1",
      x: 120,
      y: 240,
      zIndex: "a1",
      parentGroupId: group.id,
      locked: true,
      createdAt: 1712345678000,
      updatedAt: 1712345678999,
      data: { w: 320, h: 180 },
      style: { backgroundColor: "#ff0000", strokeColor: "#00ff00", strokeWidth: 3, opacity: 0.75 },
    });
    const seeded = await context.seedCanvasFixture({ name: "design-board", elements: { [element.id]: element }, groups: { [group.id]: group } });

    const result = await context.runCanvasCli(["inspect", element.id, "--canvas", seeded.canvas.id, "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout(result)).toMatchObject({
      ok: true,
      command: "canvas.inspect",
      mode: "summary",
      selector: { targetId: "rect-1", canvasId: seeded.canvas.id, canvasNameQuery: null },
      canvas: { id: seeded.canvas.id, name: "design-board", automergeUrl: seeded.canvas.automerge_url },
      target: {
        kind: "element",
        id: "rect-1",
        type: "rect",
        parentGroupId: "group-root",
        zIndex: "a1",
        locked: true,
        position: { x: 120, y: 240 },
        createdAt: 1712345678000,
        updatedAt: 1712345678999,
      },
    });
  });

  test("inspects one group by exact id and exposes focused child details", async () => {
    const context = await createContext();
    const group = createGroup({ id: "group-root", zIndex: "a0", createdAt: 1712000000000 });
    const childGroup = createGroup({ id: "group-child", parentGroupId: group.id, zIndex: "a1", createdAt: 1712000001000 });
    const firstElement = createRectElement({ id: "rect-a", parentGroupId: group.id, zIndex: "a2" });
    const secondElement = createRectElement({ id: "rect-b", parentGroupId: childGroup.id, zIndex: "a3" });
    const seeded = await context.seedCanvasFixture({
      name: "delivery-canvas",
      groups: { [group.id]: group, [childGroup.id]: childGroup },
      elements: { [firstElement.id]: firstElement, [secondElement.id]: secondElement },
    });

    const result = await context.runCanvasCli(["inspect", group.id, "--canvas", seeded.canvas.id, "--output", "focused", "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout(result)).toMatchObject({
      ok: true,
      command: "canvas.inspect",
      mode: "focused",
      canvas: { id: seeded.canvas.id, name: "delivery-canvas" },
      target: {
        kind: "group",
        id: "group-root",
        parentGroupId: null,
        zIndex: "a0",
        locked: false,
        createdAt: 1712000000000,
        directChildElementIds: ["rect-a"],
        directChildGroupIds: ["group-child"],
        directChildElementCount: 1,
        directChildGroupCount: 1,
        descendantElementCount: 2,
        descendantGroupCount: 1,
      },
    });
  });

  test("group summary output includes direct child ids", async () => {
    const context = await createContext();
    const group = createGroup({ id: "group-root", zIndex: "a0" });
    const childGroup = createGroup({ id: "group-child", parentGroupId: group.id, zIndex: "a1" });
    const firstElement = createRectElement({ id: "rect-a", parentGroupId: group.id, zIndex: "a2" });
    const secondElement = createRectElement({ id: "rect-b", parentGroupId: group.id, zIndex: "a3" });
    const seeded = await context.seedCanvasFixture({
      name: "group-summary-canvas",
      groups: { [group.id]: group, [childGroup.id]: childGroup },
      elements: { [firstElement.id]: firstElement, [secondElement.id]: secondElement },
    });

    const result = await context.runCanvasCli(["inspect", group.id, "--canvas", seeded.canvas.id]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout.trim()).toBe(`group group-root canvas=${seeded.canvas.id} name="group-summary-canvas" parent=null direct-elements=2 [rect-a, rect-b] direct-groups=1 [group-child] z=a0 locked=false`);
  });

  test("fails clearly when the exact id does not exist inside the selected canvas", async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: "missing-target-canvas" });

    const result = await context.runCanvasCli(["inspect", "does-not-exist", "--canvas", seeded.canvas.id, "--json"]);

    expectExitCode(result, 1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_INSPECT_TARGET_NOT_FOUND",
      message: `Target 'does-not-exist' was not found in canvas '${seeded.canvas.name}'.`,
      canvasId: seeded.canvas.id,
      targetId: "does-not-exist",
    });
  });

  test("fails when --canvas-name matches more than one canvas", async () => {
    const context = await createContext();
    const element = createRectElement({ id: "shared-target" });
    await context.seedCanvasFixture({ name: "design-board", elements: { [element.id]: element } });
    await context.seedCanvasFixture({ name: "design-review" });

    const result = await context.runCanvasCli(["inspect", "shared-target", "--canvas-name", "design", "--json"]);

    expectExitCode(result, 1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_AMBIGUOUS",
      message: "Canvas name query 'design' matched 2 canvases. Pass --canvas <id> instead.",
      canvasNameQuery: "design",
      matches: [
        { id: expect.any(String), name: "design-board" },
        { id: expect.any(String), name: "design-review" },
      ],
    });
  });

  test("returns the raw inspected payload in full mode", async () => {
    const context = await createContext();
    const element = createRectElement({
      id: "rect-full",
      x: 40,
      y: 60,
      parentGroupId: null,
      data: { w: 500, h: 240 },
      style: { backgroundColor: "#222222", strokeColor: "#eeeeee", strokeWidth: 4, opacity: 0.5 },
    });
    const seeded = await context.seedCanvasFixture({ name: "full-mode-canvas", elements: { [element.id]: element } });

    const result = await context.runCanvasCli(["inspect", element.id, "--canvas", seeded.canvas.id, "--output", "full", "--json"]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout(result)).toMatchObject({
      ok: true,
      command: "canvas.inspect",
      mode: "full",
      target: {
        kind: "element",
        id: "rect-full",
        record: {
          id: "rect-full",
          x: 40,
          y: 60,
          data: { type: "rect", w: 500, h: 240 },
          style: { backgroundColor: "#222222", strokeColor: "#eeeeee", strokeWidth: 4, opacity: 0.5 },
        },
      },
    });
  });
});
