import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { GroupPlugin } from "../../../src/plugins/Group.plugin";
import { RenderOrderPlugin } from "../../../src/plugins/RenderOrder.plugin";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
import { SelectPlugin } from "../../../src/plugins/Select.plugin";
import { Shape1dPlugin } from "../../../src/plugins/Shape1d.plugin";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import type { IPluginContext } from "../../../src/plugins/interface";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function createLineOrArrowElement(args: {
  id: string;
  type: "line" | "arrow";
  x: number;
  y: number;
}): TElement {
  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 1,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      strokeColor: "#0f172a",
      opacity: 1,
      strokeWidth: 4,
    },
    data: args.type === "arrow"
      ? {
          type: "arrow",
          lineType: "curved",
          points: [[0, 0], [50, 20], [120, 10]],
          startBinding: null,
          endBinding: null,
          startCap: "dot",
          endCap: "arrow",
        }
      : {
          type: "line",
          lineType: "curved",
          points: [[0, 0], [40, 30], [110, 0]],
          startBinding: null,
          endBinding: null,
        },
  };
}

function startAltDragGroup(group: Konva.Group) {
  const beforeNodeIds = new Set(
    group.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  group.fire("dragstart", {
    target: group,
    currentTarget: group,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = group.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Group) as Konva.Group | undefined;

  if (!previewClone) throw new Error("Expected preview clone after alt-drag start");

  return previewClone;
}

function finishAltDragGroup(previewClone: Konva.Group, args: { deltaX: number; deltaY?: number }) {

  const beforePos = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforePos.x + args.deltaX,
    y: beforePos.y + (args.deltaY ?? 0),
  });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

describe("Shape1dPlugin group clone regression", () => {
  test("alt-dragging a group that contains line and arrow clones all grouped children", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new SelectPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new GroupPlugin()],
      initializeScene(ctx) {
        context = ctx;

        const rect = Shape2dPlugin.createRectFromElement({
          id: "rect-1",
          x: 20,
          y: 20,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          updatedAt: 1,
          locked: false,
          parentGroupId: null,
          zIndex: "a0",
          data: { type: "rect", w: 120, h: 80 },
          style: { backgroundColor: "#ffffff", strokeColor: "#0f172a", strokeWidth: 2, opacity: 1 },
        });
        Shape2dPlugin.setupShapeListeners(ctx, rect);
        rect.draggable(true);
        ctx.staticForegroundLayer.add(rect);

        const line = ctx.capabilities.createShapeFromTElement?.(createLineOrArrowElement({
          id: "line-1",
          type: "line",
          x: 30,
          y: 40,
        }));
        const arrow = ctx.capabilities.createShapeFromTElement?.(createLineOrArrowElement({
          id: "arrow-1",
          type: "arrow",
          x: 30,
          y: 90,
        }));

        if (!line || !arrow) throw new Error("Expected shape1d nodes to be created");

        ctx.staticForegroundLayer.add(line);
        ctx.staticForegroundLayer.add(arrow);
        ctx.crdt.patch({
          groups: [],
          elements: [
            Shape2dPlugin.toTElement(rect),
            Shape1dPlugin.toTElement(line as Konva.Shape as any),
            Shape1dPlugin.toTElement(arrow as Konva.Shape as any),
          ],
        });
      },
    });

    const rect = harness.staticForegroundLayer.findOne("#rect-1") as Konva.Rect;
    const line = harness.staticForegroundLayer.findOne("#line-1") as Konva.Shape;
    const arrow = harness.staticForegroundLayer.findOne("#arrow-1") as Konva.Shape;
    const group = GroupPlugin.group(context, [rect, line, arrow]);
    expect(group).toBeInstanceOf(Konva.Group);

    context.setState("selection", [group]);
    const previewClone = startAltDragGroup(group);
    expect(previewClone.find((node: Konva.Node) => Shape1dPlugin.hasRenderableRuntime(node))).toHaveLength(2);

    finishAltDragGroup(previewClone, { deltaX: 180, deltaY: 40 });
    await flushCanvasEffects();

    const groups = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Group) as Konva.Group[];
    expect(groups).toHaveLength(2);

    const clonedGroup = groups.find((candidate) => candidate.id() !== group.id());
    expect(clonedGroup).toBeTruthy();
    expect(clonedGroup?.find((node: Konva.Node) => node instanceof Konva.Rect)).toHaveLength(1);
    expect(clonedGroup?.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(2);
    expect(clonedGroup?.find((node: Konva.Node) => Shape1dPlugin.hasRenderableRuntime(node))).toHaveLength(2);

    const clonedLineAndArrow = Object.values(docHandle.doc().elements).filter((element) => element.parentGroupId === clonedGroup?.id());
    expect(clonedLineAndArrow).toHaveLength(3);
    expect(clonedLineAndArrow.filter((element) => element.data.type === "line" || element.data.type === "arrow")).toHaveLength(2);

    harness.destroy();
  });

  test("alt-dragging a hydrated recorded group clones its arrow child", async () => {
    const docHandle = createMockDocHandle({
      id: "1228b868-af76-422c-9776-250728aeddb8",
      elements: {
        "f9703789-64a8-4865-8791-38e422ad13cc": {
          id: "f9703789-64a8-4865-8791-38e422ad13cc",
          zIndex: "z00000000",
          rotation: 0,
          x: 431.4406982331422,
          y: 44.421977111718604,
          bindings: [],
          createdAt: 1774569323095,
          locked: false,
          parentGroupId: "55d37c5b-11c8-4e25-868d-3b41d52e00b7",
          updatedAt: 1774569323095,
          data: { type: "rect", w: 115.40727245640466, h: 125.90135322535252 },
          style: { opacity: 1, strokeWidth: 2, backgroundColor: "red" },
        },
        "3d3c1399-bc48-4fb7-9840-40c3e19e2f8f": {
          id: "3d3c1399-bc48-4fb7-9840-40c3e19e2f8f",
          zIndex: "z00000001",
          x: 622.8564135923573,
          y: 112.14561940746466,
          rotation: 0,
          bindings: [],
          createdAt: 1774569323096,
          locked: false,
          parentGroupId: "55d37c5b-11c8-4e25-868d-3b41d52e00b7",
          updatedAt: 1774569323096,
          data: {
            type: "arrow",
            lineType: "straight",
            points: [[0, 0], [103.5968289243342, -1.2887467610988779]],
            startBinding: null,
            endBinding: null,
            startCap: "none",
            endCap: "arrow",
          },
          style: { opacity: 0.92, strokeWidth: 4, strokeColor: "#0f172a" },
        },
      },
      groups: {
        "55d37c5b-11c8-4e25-868d-3b41d52e00b7": {
          id: "55d37c5b-11c8-4e25-868d-3b41d52e00b7",
          zIndex: "z00000002",
          parentGroupId: null,
          locked: false,
          createdAt: 1774569323095,
        },
      },
    }) as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new SelectPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne("#55d37c5b-11c8-4e25-868d-3b41d52e00b7") as Konva.Group;
    expect(group).toBeTruthy();
    expect(group.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(1);
    expect(group.find((node: Konva.Node) => Shape1dPlugin.hasRenderableRuntime(node))).toHaveLength(1);

    const previewClone = startAltDragGroup(group);
    expect(previewClone.find((node: Konva.Node) => Shape1dPlugin.hasRenderableRuntime(node))).toHaveLength(1);

    finishAltDragGroup(previewClone, { deltaX: 0, deltaY: 224 });
    await flushCanvasEffects();

    const groups = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Group) as Konva.Group[];
    expect(groups).toHaveLength(2);

    const clonedGroup = groups.find((candidate) => candidate.id() !== group.id());
    expect(clonedGroup).toBeTruthy();
    expect(clonedGroup?.find((node: Konva.Node) => node instanceof Konva.Rect)).toHaveLength(1);
    expect(clonedGroup?.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(1);
    expect(clonedGroup?.find((node: Konva.Node) => Shape1dPlugin.hasRenderableRuntime(node))).toHaveLength(1);

    const clonedChildren = Object.values(docHandle.doc().elements).filter((element) => element.parentGroupId === clonedGroup?.id());
    expect(clonedChildren).toHaveLength(2);
    expect(clonedChildren.filter((element) => element.data.type === "arrow")).toHaveLength(1);

    harness.destroy();
  });

  test("preview clone preserves on-screen size and position under camera zoom", async () => {
    const docHandle = createMockDocHandle({
      id: "1228b868-af76-422c-9776-250728aeddb8",
      elements: {
        "0e6294a8-6fc1-4274-897f-b875874f1862": {
          bindings: [],
          createdAt: 1774599159507,
          data: { h: 125.90135322535252, type: "rect", w: 115.40727245640466 },
          id: "0e6294a8-6fc1-4274-897f-b875874f1862",
          locked: false,
          parentGroupId: "56965f62-ed71-414e-a16f-068c9638ec7b",
          rotation: 0,
          style: { backgroundColor: "red", opacity: 1, strokeWidth: 2 },
          updatedAt: 1774599159507,
          x: 282.6482238763534,
          y: 39.41426227063414,
          zIndex: "z00000000",
        },
        "553bf344-a0e1-46ca-a01f-bc6422cb697e": {
          bindings: [],
          createdAt: 1774599159507,
          data: {
            endBinding: null,
            endCap: "arrow",
            lineType: "straight",
            points: [[0, 0], [103.5968289243342, -1.2887467610988779]],
            startBinding: null,
            startCap: "none",
            type: "arrow",
          },
          id: "553bf344-a0e1-46ca-a01f-bc6422cb697e",
          locked: false,
          parentGroupId: "56965f62-ed71-414e-a16f-068c9638ec7b",
          rotation: 0,
          style: { opacity: 0.92, strokeColor: "#0f172a", strokeWidth: 4 },
          updatedAt: 1774599159507,
          x: 568.3265594759437,
          y: 144.84295266253037,
          zIndex: "z00000001",
        },
      },
      groups: {
        "56965f62-ed71-414e-a16f-068c9638ec7b": {
          createdAt: 1774571973868,
          id: "56965f62-ed71-414e-a16f-068c9638ec7b",
          locked: false,
          parentGroupId: null,
          zIndex: "z00000000",
        },
      },
    }) as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new SelectPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
      initializeScene(context) {
        context.camera.pan(-180, -90);
        context.camera.zoomAtScreenPoint(1.6, { x: 360, y: 220 });
      },
    });

    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne("#56965f62-ed71-414e-a16f-068c9638ec7b") as Konva.Group;
    expect(group).toBeTruthy();

    const originalRect = group.getClientRect({ relativeTo: harness.stage });
    const previewClone = startAltDragGroup(group);
    const previewRect = previewClone.getClientRect({ relativeTo: harness.stage });

    expect(previewRect.x).toBeCloseTo(originalRect.x, 4);
    expect(previewRect.y).toBeCloseTo(originalRect.y, 4);
    expect(previewRect.width).toBeCloseTo(originalRect.width, 4);
    expect(previewRect.height).toBeCloseTo(originalRect.height, 4);

    harness.destroy();
  });
});
