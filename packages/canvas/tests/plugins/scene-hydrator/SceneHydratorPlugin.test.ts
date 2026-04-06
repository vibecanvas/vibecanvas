import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import { describe, expect, test } from "vitest";
import { GroupPlugin, RenderOrderPlugin, SceneHydratorPlugin, Shape2dPlugin } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle } from "../../test-setup";

function createRectElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "element-1",
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "a0",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: "rect",
      w: 100,
      h: 80,
    },
    style: {
      backgroundColor: "#f00",
      strokeColor: "#111",
      strokeWidth: 2,
      opacity: 0.8,
    },
    ...overrides,
  };
}

function createGroup(overrides?: Partial<TGroup>): TGroup {
  return {
    id: "group-1",
    parentGroupId: null,
    zIndex: "a0",
    locked: false,
    createdAt: 1,
    ...overrides,
  };
}

describe("SceneHydratorPlugin", () => {
  test("hydrates valid hierarchy root-to-leaf and deletes orphan groups and elements from crdt", async () => {
    const rootGroup = createGroup({ id: "group-root" });
    const childGroup = createGroup({ id: "group-child", parentGroupId: rootGroup.id });
    const validElement = createRectElement({ id: "element-valid", parentGroupId: childGroup.id });
    const orphanGroupA = createGroup({ id: "group-orphan-a", parentGroupId: "group-orphan-b" });
    const orphanGroupB = createGroup({ id: "group-orphan-b", parentGroupId: orphanGroupA.id });
    const orphanElement = createRectElement({ id: "element-orphan", parentGroupId: orphanGroupA.id });
    const missingParentElement = createRectElement({ id: "element-missing-parent", parentGroupId: "missing-group" });

    const docHandle = createMockDocHandle({
      groups: {
        [rootGroup.id]: rootGroup,
        [childGroup.id]: childGroup,
        [orphanGroupA.id]: orphanGroupA,
        [orphanGroupB.id]: orphanGroupB,
      },
      elements: {
        [validElement.id]: validElement,
        [orphanElement.id]: orphanElement,
        [missingParentElement.id]: missingParentElement,
      },
    }) as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
    });

    const hydratedRootGroup = harness.staticForegroundLayer.findOne<Konva.Group>("#group-root");
    const hydratedChildGroup = harness.staticForegroundLayer.findOne<Konva.Group>("#group-child");
    const hydratedValidElement = harness.staticForegroundLayer.findOne<Konva.Rect>("#element-valid");
    const hydratedOrphanGroupA = harness.staticForegroundLayer.findOne<Konva.Group>("#group-orphan-a");
    const hydratedOrphanGroupB = harness.staticForegroundLayer.findOne<Konva.Group>("#group-orphan-b");
    const hydratedOrphanElement = harness.staticForegroundLayer.findOne<Konva.Rect>("#element-orphan");
    const hydratedMissingParentElement = harness.staticForegroundLayer.findOne<Konva.Rect>("#element-missing-parent");
    const doc = docHandle.doc();

    expect(hydratedRootGroup).toBeTruthy();
    expect(hydratedRootGroup?.getParent()).toBe(harness.staticForegroundLayer);
    expect(hydratedChildGroup).toBeTruthy();
    expect(hydratedChildGroup?.getParent()).toBe(hydratedRootGroup);
    expect(hydratedValidElement).toBeTruthy();
    expect(hydratedValidElement?.getParent()).toBe(hydratedChildGroup);

    expect(hydratedOrphanGroupA).toBeFalsy();
    expect(hydratedOrphanGroupB).toBeFalsy();
    expect(hydratedOrphanElement).toBeFalsy();
    expect(hydratedMissingParentElement).toBeFalsy();

    expect(doc.groups[rootGroup.id]).toEqual(rootGroup);
    expect(doc.groups[childGroup.id]).toEqual(childGroup);
    expect(doc.groups[orphanGroupA.id]).toBeUndefined();
    expect(doc.groups[orphanGroupB.id]).toBeUndefined();
    expect(doc.elements[validElement.id]).toEqual(validElement);
    expect(doc.elements[orphanElement.id]).toBeUndefined();
    expect(doc.elements[missingParentElement.id]).toBeUndefined();

    harness.destroy();
  });
});
