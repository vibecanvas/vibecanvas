import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { CanvasRegistryService } from "../../src/services/canvas-registry/CanvasRegistryService";

function createElement(args?: { id?: string; type?: "text" }): TElement {
  return {
    id: args?.id ?? "element-1",
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "z00000000",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: args?.type ?? "text",
      w: 100,
      h: 40,
      text: "hello",
      originalText: "hello",
      fontFamily: "Arial",
      link: null,
      containerId: null,
      autoResize: false,
    },
    style: {},
  };
}

function createGroup(id = "group-1"): TGroup {
  return {
    id,
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
  };
}

describe("CanvasRegistryService", () => {
  test("registers and sorts element definitions and emits hooks on change", () => {
    const service = new CanvasRegistryService();
    const changeSpy = vi.fn();
    service.hooks.elementsChange.tap(changeSpy);

    const unregisterB = service.registerElement({
      id: "b",
      priority: 20,
      matchesElement: () => false,
      getSelectionStyleMenu: () => null,
    });
    service.registerElement({
      id: "a",
      priority: 20,
      matchesElement: () => false,
      getSelectionStyleMenu: () => null,
    });
    service.registerElement({
      id: "c",
      priority: 5,
      matchesElement: () => false,
      getSelectionStyleMenu: () => null,
    });

    expect(service.getElements().map((definition) => definition.id)).toEqual(["c", "a", "b"]);
    expect(changeSpy).toHaveBeenCalledTimes(3);

    unregisterB();
    expect(service.getElements().map((definition) => definition.id)).toEqual(["c", "a"]);
    expect(changeSpy).toHaveBeenCalledTimes(4);

    service.unregisterElement("missing");
    expect(changeSpy).toHaveBeenCalledTimes(4);
  });

  test("serializes nodes with base and modifier definitions in priority order", () => {
    const service = new CanvasRegistryService();
    const node = new Konva.Rect({ id: "shape-1" });
    const calls: string[] = [];

    service.registerElement({
      id: "modifier",
      priority: 20,
      matchesNode: () => true,
      afterToElement: ({ element }) => {
        calls.push(`after:${element.id}`);
        return {
          ...element,
          updatedAt: 99,
        };
      },
    });
    service.registerElement({
      id: "base",
      priority: 10,
      matchesNode: () => true,
      toElement: (candidate) => {
        calls.push(`base:${candidate.id()}`);
        return createElement({ id: candidate.id(), type: "text" });
      },
    });
    service.registerElement({
      id: "base-after",
      priority: 15,
      matchesNode: () => true,
      afterToElement: ({ element }) => {
        calls.push(`base-after:${element.id}`);
      },
    });

    const element = service.toElement(node);

    expect(element).toMatchObject({
      id: "shape-1",
      updatedAt: 99,
      data: { type: "text" },
    });
    expect(calls).toEqual(["base:shape-1", "base-after:shape-1", "after:shape-1"]);
    expect(service.getNodeType(node)).toBe("text");
  });

  test("creates nodes, runs modifiers and listeners, and aggregates update results", () => {
    const service = new CanvasRegistryService();
    const element = createElement({ id: "shape-2", type: "text" });
    const node = new Konva.Rect({ id: "shape-2" });
    const calls: string[] = [];

    service.registerElement({
      id: "modifier-a",
      priority: 15,
      matchesElement: () => true,
      matchesNode: (candidate) => candidate.id() === node.id(),
      afterCreateNode: ({ node: createdNode }) => {
        calls.push(`after-a:${createdNode.id()}`);
      },
      attachListeners: (candidate) => {
        calls.push(`listen-a:${candidate.id()}`);
        return false;
      },
      updateElement: () => {
        calls.push("update-a");
      },
    });
    service.registerElement({
      id: "base",
      priority: 10,
      matchesElement: () => true,
      matchesNode: (candidate) => candidate.id() === node.id(),
      createNode: (candidate) => {
        calls.push(`create:${candidate.id}`);
        return node;
      },
      attachListeners: (candidate) => {
        calls.push(`listen-base:${candidate.id()}`);
        return true;
      },
      updateElement: () => {
        calls.push("update-base");
        return true;
      },
    });
    service.registerElement({
      id: "base-after",
      priority: 12,
      matchesElement: () => true,
      afterCreateNode: ({ node: createdNode }) => {
        calls.push(`after-base:${createdNode.id()}`);
      },
    });

    expect(service.createNodeFromElement(element)).toBe(node);
    expect(calls).toEqual([
      "create:shape-2",
      "after-base:shape-2",
      "after-a:shape-2",
      "listen-base:shape-2",
      "listen-a:shape-2",
    ]);

    calls.length = 0;
    expect(service.attachListeners(node)).toBe(true);
    expect(calls).toEqual(["listen-base:shape-2", "listen-a:shape-2"]);

    calls.length = 0;
    expect(service.updateElement(element)).toBe(true);
    expect(calls).toEqual(["update-base", "update-a"]);
  });

  test("prefers group semantics for type, creation, serialization, and listener attachment", () => {
    const service = new CanvasRegistryService();
    const node = new Konva.Group({ id: "group-1" });
    const group = createGroup("group-1");
    const groupChangeSpy = vi.fn();
    const calls: string[] = [];

    service.hooks.groupsChange.tap(groupChangeSpy);

    service.registerElement({
      id: "element-fallback",
      matchesNode: () => true,
      toElement: () => createElement({ id: "group-1", type: "text" }),
      attachListeners: () => {
        calls.push("element-listeners");
        return true;
      },
    });

    const unregisterGroup = service.registerGroup({
      id: "group-def",
      priority: 5,
      matchesNode: (candidate) => candidate.id() === node.id(),
      toGroup: (candidate) => candidate.id() === group.id ? group : null,
      createNode: (candidate) => candidate.id === group.id ? node : null,
      attachListeners: (candidate) => {
        calls.push(`group-listeners:${candidate.id()}`);
        return true;
      },
    });

    expect(groupChangeSpy).toHaveBeenCalledTimes(1);
    expect(service.toGroup(node)).toEqual(group);
    expect(service.getNodeType(node)).toBe("group");
    expect(service.createNodeFromGroup(group)).toBe(node);
    expect(calls).toEqual(["group-listeners:group-1"]);

    calls.length = 0;
    expect(service.attachListeners(node)).toBe(true);
    expect(calls).toEqual(["group-listeners:group-1"]);

    unregisterGroup();
    expect(groupChangeSpy).toHaveBeenCalledTimes(2);
    expect(service.getGroups()).toEqual([]);
  });

  test("merges transform options and aggregates transform hook results", () => {
    const service = new CanvasRegistryService();
    const node = new Konva.Rect({ id: "shape-3" });
    const element = createElement({ id: "shape-3", type: "text" });
    const selection = [node] as Array<Konva.Group | Konva.Shape>;
    const calls: string[] = [];

    service.registerElement({
      id: "base",
      priority: 10,
      matchesNode: (candidate) => candidate.id() === node.id(),
      toElement: () => element,
      getTransformOptions: ({ node: candidateNode, element: candidateElement, selection: candidateSelection }) => {
        calls.push(`options-base:${candidateNode.id()}:${candidateElement.id}:${candidateSelection.length}`);
        return {
          enabledAnchors: ["top-left", "bottom-right"],
          keepRatio: true,
        };
      },
      onResize: ({ node: candidateNode }) => {
        calls.push(`on-base:${candidateNode.id()}`);
        return { cancel: false, crdt: true };
      },
      afterResize: ({ node: candidateNode }) => {
        calls.push(`after-base:${candidateNode.id()}`);
        return { cancel: false, crdt: false };
      },
    });

    service.registerElement({
      id: "modifier",
      priority: 20,
      matchesNode: (candidate) => candidate.id() === node.id(),
      getTransformOptions: ({ node: candidateNode }) => {
        calls.push(`options-modifier:${candidateNode.id()}`);
        return {
          flipEnabled: true,
          keepRatio: false,
        };
      },
      onResize: ({ node: candidateNode }) => {
        calls.push(`on-modifier:${candidateNode.id()}`);
        return { cancel: true, crdt: false };
      },
      afterResize: ({ node: candidateNode }) => {
        calls.push(`after-modifier:${candidateNode.id()}`);
        return { cancel: true, crdt: true };
      },
    });

    expect(service.getTransformOptions({ node, selection })).toEqual({
      enabledAnchors: ["top-left", "bottom-right"],
      keepRatio: false,
      flipEnabled: true,
    });
    const resizeArgs = { node, element, pointer: null, anchors: ["top-left"] as Array<"top-left">, selection };
    const definitions = service.getMatchingElementDefinitionsByNode(node);
    const onResizeResult = definitions.reduce((result, definition) => {
      const next = definition.onResize?.(resizeArgs);
      if (!next) {
        return result;
      }

      return {
        cancel: result.cancel || next.cancel,
        crdt: result.crdt || next.crdt,
      };
    }, { cancel: false, crdt: false });
    const afterResizeResult = definitions.reduce((result, definition) => {
      const next = definition.afterResize?.(resizeArgs);
      if (!next) {
        return result;
      }

      return {
        cancel: result.cancel || next.cancel,
        crdt: result.crdt || next.crdt,
      };
    }, { cancel: false, crdt: false });

    expect(onResizeResult).toEqual({ cancel: true, crdt: true });
    expect(afterResizeResult).toEqual({ cancel: true, crdt: true });
    expect(calls).toEqual([
      "options-base:shape-3:shape-3:1",
      "options-modifier:shape-3",
      "on-base:shape-3",
      "on-modifier:shape-3",
      "after-base:shape-3",
      "after-modifier:shape-3",
    ]);
  });

  test("returns default transform results when node does not resolve to an element", () => {
    const service = new CanvasRegistryService();
    const node = new Konva.Rect({ id: "unknown" });
    const selection = [node] as Array<Konva.Group | Konva.Shape>;

    expect(service.getTransformOptions({ node, selection })).toEqual({});
    expect(service.getMatchingElementDefinitionsByNode(node)).toEqual([]);
  });
});
