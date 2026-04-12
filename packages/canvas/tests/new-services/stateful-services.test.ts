import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { ContextMenuService } from "../../src/new-services/context-menu/ContextMenuService";
import { EditorService } from "../../src/new-services/editor/EditorService";
import { HistoryService } from "../../src/new-services/history/HistoryService";
import { SelectionService } from "../../src/new-services/selection/SelectionService";
import { ThemeService } from "../../src/new-services/theme/ThemeService";
import { THEME_ID_LIGHT } from "../../src/new-services/theme/enum";

function createElement(id: string): TElement {
  return {
    id,
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
      type: "text",
      w: 100,
      h: 40,
      text: "hello",
      originalText: "hello",
      fontSize: 16,
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
    style: {},
  };
}

function createGroup(id: string): TGroup {
  return {
    id,
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
  };
}

describe("new stateful services", () => {
  test("ThemeService starts with light theme", () => {
    const service = new ThemeService();
    expect(service.name).toBe("theme");
    expect(service.getThemeId()).toBe(THEME_ID_LIGHT);
    expect(service.getTheme().id).toBe(THEME_ID_LIGHT);
  });

  test("SelectionService updates selection and focus and emits change", () => {
    const service = new SelectionService();
    const changeSpy = vi.fn();
    service.hooks.change.tap(changeSpy);

    const rect = new Konva.Rect({ id: "rect-1" });
    service.setSelection([rect]);
    expect(service.selection).toEqual([rect]);
    expect(changeSpy).toHaveBeenCalledTimes(1);

    service.setFocusedNode(rect);
    expect(service.focusedId).toBe("rect-1");
    expect(changeSpy).toHaveBeenCalledTimes(2);

    service.clear();
    expect(service.selection).toEqual([]);
    expect(service.focusedId).toBeNull();
    expect(changeSpy).toHaveBeenCalledTimes(3);
  });

  test("HistoryService records, undoes, redoes, and clears", () => {
    const service = new HistoryService();
    const steps: string[] = [];

    service.record({
      label: "x",
      undo: () => steps.push("undo"),
      redo: () => steps.push("redo"),
    });

    expect(service.canUndo()).toBe(true);
    expect(service.getUndoStackSize()).toBe(1);
    expect(service.undo()).toBe(true);
    expect(steps).toEqual(["undo"]);
    expect(service.canRedo()).toBe(true);
    expect(service.redo()).toBe(true);
    expect(steps).toEqual(["undo", "redo"]);

    service.clear();
    expect(service.getUndoStackSize()).toBe(0);
    expect(service.getRedoStackSize()).toBe(0);
  });

  test("EditorService manages tool and registry flows", () => {
    const service = new EditorService();
    const textNode = new Konva.Text({ id: "text-1" });
    const groupNode = new Konva.Group({ id: "group-1" });
    const transformer = new Konva.Transformer();
    const preview = new Konva.Rect({ id: "preview-1" });
    const element = createElement("text-1");
    const group = createGroup("group-1");

    service.registerTool({
      id: "text",
      label: "Text",
      priority: 20,
      behavior: { type: "mode", mode: "click-create" },
    });
    service.registerTool({
      id: "select",
      label: "Select",
      priority: 10,
      behavior: { type: "mode", mode: "select" },
    });

    expect(service.getTools().map((tool) => tool.id)).toEqual(["select", "text"]);
    service.setActiveTool("text");
    expect(service.activeToolId).toBe("text");
    expect(service.getActiveTool()?.id).toBe("text");

    service.setEditingTextId("text-1");
    service.setEditingShape1dId("shape-1");
    service.setPreviewNode(preview);
    service.setTransformer(transformer);
    expect(service.editingTextId).toBe("text-1");
    expect(service.editingShape1dId).toBe("shape-1");
    expect(service.previewNode).toBe(preview);
    expect(service.transformer).toBe(transformer);

    service.registerToElement("text", (node) => node === textNode ? element : null);
    service.registerToGroup("group", (node) => node === groupNode ? group : null);
    service.registerCreateGroupFromTGroup("group", (candidate) => candidate.id === group.id ? groupNode : null);
    service.registerCreateShapeFromTElement("text", (candidate) => candidate.id === element.id ? textNode : null);
    service.registerSetupExistingShape("text", (node) => node === textNode);
    service.registerUpdateShapeFromTElement("text", (candidate) => candidate.id === element.id);
    service.registerCloneElement("text", ({ sourceElement }) => sourceElement.id === element.id);

    expect(service.toElement(textNode)).toEqual(element);
    expect(service.toGroup(groupNode)).toEqual(group);
    expect(service.createGroupFromTGroup(group)).toBe(groupNode);
    expect(service.createShapeFromTElement(element)).toBe(textNode);
    expect(service.setupExistingShape(textNode)).toBe(true);
    expect(service.updateShapeFromTElement(element)).toBe(true);
    expect(service.cloneElement({ sourceElement: element, clonedElement: { ...element, id: "text-2" } })).toBe(true);

    service.unregisterTool("text");
    expect(service.activeToolId).toBe("select");
  });

  test("ContextMenuService sorts actions and falls back to no-actions item", () => {
    const service = new ContextMenuService();
    const editor = new EditorService();
    const node = new Konva.Rect({ id: "shape-1" });
    const onSelect = vi.fn();

    service.registerProvider("a", () => [
      { id: "z", label: "Zed", priority: 20, onSelect },
      { id: "hidden", label: "Hidden", hidden: true, onSelect },
    ]);
    service.registerProvider("b", () => [
      { id: "a", label: "Alpha", priority: 10, onSelect },
    ]);

    const context = {
      scope: "item" as const,
      targetNode: node,
      targetElement: null,
      targetGroup: null,
      selection: [node],
      activeSelection: [node],
      editor,
    };

    expect(service.getActions(context).map((action) => action.label)).toEqual(["Alpha", "Zed"]);

    service.openAt({ x: 12, y: 34, context });
    expect(service.open).toBe(true);
    expect(service.x).toBe(12);
    expect(service.y).toBe(34);
    expect(service.actions.map((action) => action.label)).toEqual(["Alpha", "Zed"]);

    service.unregisterProvider("a");
    service.unregisterProvider("b");
    service.openAt({ x: 1, y: 2, context });
    expect(service.actions).toHaveLength(1);
    expect(service.actions[0]?.id).toBe("no-actions");
    service.close();
    expect(service.open).toBe(false);
    expect(service.context).toBeNull();
  });
});
