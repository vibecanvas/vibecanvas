import type { IPlugin } from "@vibecanvas/runtime";
import ArrowRight from "lucide-static/icons/arrow-right.svg?raw";
import type Konva from "konva";
import Minus from "lucide-static/icons/minus.svg?raw";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { ThemeService } from "@vibecanvas/service-theme";
import { CanvasMode } from "../../new-services/selection/enum";
import type { IHooks } from "../../runtime";
import { fxFilterSelection } from "../../core/fn.filter-selection";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { createDraftElement, createFallbackPreviewElement } from "./Shape1d.draft";
import { createPreviewClone, safeStopDrag, toTElement, updateShapeFromElement } from "./Shape1d.element";
import { applyAnchorDrag, getInsertionPoint, localPointToWorld } from "./Shape1d.geometry";
import { recordCreateHistory, recordElementHistory, type TPortalRecordShape1dHistory } from "./Shape1d.history";
import { attachShapeRuntime, createShapeFromElement } from "./Shape1d.render";
import { createCloneDrag, finalizePreviewClone, setupShapeListeners } from "./Shape1d.runtime";
import {
  EDIT_HANDLE_FILL,
  EDIT_HANDLE_RADIUS,
  EDIT_HANDLE_STROKE,
  INSERT_HANDLE_RADIUS,
  type THandleDragSnapshot,
  type TPoint,
  type TShape1dNode,
  findShape1dNodeById,
  getElementData,
  hasRenderableRuntime,
  isShape1dNode,
  isSupportedElementType,
  isSupportedTool,
} from "./Shape1d.shared";

function createCreateId(render: RenderService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `shape1d-${Date.now()}-${fallbackId}`;
  };
}

/**
 * Owns line and arrow tool registration, draw-create flow, edit handles,
 * drag + clone behavior, and editor shape registries.
 */
export function createShape1dPlugin(): IPlugin<{
  camera: CameraService;
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  let previewShape: TShape1dNode | null = null;
  let draftElementId: string | null = null;
  let draftStartPoint: TPoint | null = null;
  let draftCurrentPoint: TPoint | null = null;
  let anchorHandles: Konva.Circle[] = [];
  let insertHandles: Konva.Circle[] = [];
  let activeHandleDrag: THandleDragSnapshot | null = null;
  let previousToolId = "select";

  return {
    name: "shape1d",
    apply(ctx) {
      const camera = ctx.services.require("camera");
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      previousToolId = editor.activeToolId;
      const createId = createCreateId(render);
      const now = () => Date.now();

      const historyPortal: TPortalRecordShape1dHistory = {
        crdt,
        editor,
        history,
        render,
        renderOrder,
        selection,
        theme,
        setupNode,
      };

      const runtimePortal = {
        ...historyPortal,
        hooks: ctx.hooks,
        theme,
        createId,
        now,
      };

      function currentTool() {
        return isSupportedTool(editor.activeToolId) ? editor.activeToolId : null;
      }

      function createDraftFromState() {
        const tool = currentTool();
        if (!tool) {
          return null;
        }

        return createDraftElement({
          activeTool: tool,
          draftElementId,
          draftStartPoint,
          draftCurrentPoint,
          createId,
          now,
        });
      }

      function createFallbackPreviewFromState() {
        const tool = currentTool();
        if (!tool) {
          return null;
        }

        return createFallbackPreviewElement({
          activeTool: tool,
          draftElementId,
          createId,
          now,
        });
      }

      function resetDraft() {
        draftElementId = null;
        draftStartPoint = null;
        draftCurrentPoint = null;
      }

      function resetPreview() {
        if (!previewShape) {
          editor.setPreviewNode(null);
          return;
        }

        previewShape.destroy();
        previewShape = null;
        editor.setPreviewNode(null);
        render.dynamicLayer.batchDraw();
      }

      function ensurePreviewShape() {
        if (previewShape) {
          return previewShape;
        }

        const previewElement = createFallbackPreviewFromState();
        if (!previewElement) {
          return null;
        }

        previewShape = createShapeFromElement(theme, previewElement);
        previewShape.listening(false);
        previewShape.visible(false);
        previewShape.draggable(false);
        render.dynamicLayer.add(previewShape);
        editor.setPreviewNode(previewShape);
        return previewShape;
      }

      function syncPreview() {
        const element = createDraftFromState();
        if (!element) {
          resetPreview();
          return;
        }

        const nextPreviewShape = ensurePreviewShape();
        if (!nextPreviewShape) {
          return;
        }

        updateShapeFromElement(theme, nextPreviewShape, element);
        nextPreviewShape.listening(false);
        nextPreviewShape.visible(true);
        nextPreviewShape.draggable(false);
        render.dynamicLayer.batchDraw();
      }

      function clearEditHandles() {
        anchorHandles.forEach((handle) => {
          handle.destroy();
        });
        insertHandles.forEach((handle) => {
          handle.destroy();
        });
        anchorHandles = [];
        insertHandles = [];
        render.dynamicLayer.batchDraw();
      }

      function refreshEditHandlePositions(node: TShape1dNode) {
        const data = getElementData(node);
        if (!data) {
          return;
        }

        anchorHandles.forEach((handle, pointIndex) => {
          const point = data.points[pointIndex];
          if (point) {
            handle.position(localPointToWorld(node, point));
          }
        });
        insertHandles.forEach((handle, segmentIndex) => {
          handle.position(localPointToWorld(node, getInsertionPoint(data, segmentIndex)));
        });
        render.dynamicLayer.batchDraw();
      }

      function exitEditMode(args?: { preserveSelection?: boolean }) {
        const editingId = editor.editingShape1dId;
        if (editingId !== null) {
          const node = findShape1dNodeById(render, editingId);
          if (node) {
            const previousDraggable = node.getAttr("vcShape1dPrevDraggable");
            node.draggable(typeof previousDraggable === "boolean" ? previousDraggable : true);
            node.setAttr("vcShape1dPrevDraggable", undefined);
          }
        }

        activeHandleDrag = null;
        clearEditHandles();
        editor.setEditingShape1dId(null);
        if (!args?.preserveSelection && selection.selection.length === 1 && selection.selection[0]?.id() === editingId) {
          selection.clear();
        }
      }

      function renderEditHandles(node: TShape1dNode) {
        clearEditHandles();
        const data = getElementData(node);
        if (!data || data.points.length === 0) {
          return;
        }

        data.points.forEach((point, pointIndex) => {
          const worldPoint = localPointToWorld(node, point);
          const handle = new render.Circle({
            x: worldPoint.x,
            y: worldPoint.y,
            radius: EDIT_HANDLE_RADIUS,
            fill: EDIT_HANDLE_FILL,
            stroke: EDIT_HANDLE_STROKE,
            strokeWidth: 2,
            draggable: true,
          });

          handle.setAttr("vcInteractionOverlay", true);
          handle.setAttr("vcShape1dHandleKind", "anchor");
          handle.setAttr("vcShape1dPointIndex", pointIndex);
          handle.on("dragstart", () => {
            const editableNode = findShape1dNodeById(render, node.id());
            if (!editableNode) {
              return;
            }

            activeHandleDrag = {
              nodeId: editableNode.id(),
              pointIndex,
              beforeElement: toTElement(editableNode),
              beforePoints: structuredClone(getElementData(editableNode)?.points ?? []),
              beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy(),
            };
          });
          handle.on("dragmove", () => {
            const drag = activeHandleDrag;
            if (!drag) {
              return;
            }

            const editableNode = findShape1dNodeById(render, drag.nodeId);
            const pointer = render.dynamicLayer.getRelativePointerPosition();
            if (!editableNode || !pointer) {
              return;
            }

            applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
            refreshEditHandlePositions(editableNode);
          });
          handle.on("dragend", () => {
            const drag = activeHandleDrag;
            activeHandleDrag = null;
            if (!drag) {
              return;
            }

            const editableNode = findShape1dNodeById(render, drag.nodeId);
            if (!editableNode) {
              return;
            }

            const afterElement = toTElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            recordElementHistory(historyPortal, {
              beforeElement: drag.beforeElement,
              afterElement,
              label: "edit-shape1d-point",
            });
            renderEditHandles(editableNode);
          });
          render.dynamicLayer.add(handle);
          anchorHandles.push(handle);
        });

        for (let index = 0; index < data.points.length - 1; index += 1) {
          const insertPoint = getInsertionPoint(data, index);
          const worldPoint = localPointToWorld(node, insertPoint);
          const handle = new render.Circle({
            x: worldPoint.x,
            y: worldPoint.y,
            radius: INSERT_HANDLE_RADIUS,
            fill: "rgba(255,255,255,0.92)",
            stroke: EDIT_HANDLE_STROKE,
            strokeWidth: 2,
            dash: [2, 2],
            draggable: true,
          });

          handle.setAttr("vcInteractionOverlay", true);
          handle.setAttr("vcShape1dHandleKind", "insert");
          handle.setAttr("vcShape1dSegmentIndex", index);
          handle.on("dragstart", () => {
            const editableNode = findShape1dNodeById(render, node.id());
            if (!editableNode) {
              return;
            }

            const beforeElement = toTElement(editableNode);
            const currentData = getElementData(editableNode);
            if (!currentData) {
              return;
            }

            const createdPoint = getInsertionPoint(currentData, index);
            const nextData = structuredClone(currentData);
            nextData.points.splice(index + 1, 0, createdPoint);
            editableNode.setAttr("vcElementData", nextData);
            editableNode.getLayer()?.batchDraw();
            handle.setAttr("vcShape1dHandleKind", "anchor");
            handle.setAttr("vcShape1dPointIndex", index + 1);
            activeHandleDrag = {
              nodeId: editableNode.id(),
              pointIndex: index + 1,
              beforeElement,
              beforePoints: structuredClone(currentData.points),
              beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy(),
            };
          });
          handle.on("dragmove", () => {
            const drag = activeHandleDrag;
            if (!drag) {
              return;
            }

            const editableNode = findShape1dNodeById(render, drag.nodeId);
            const pointer = render.dynamicLayer.getRelativePointerPosition();
            if (!editableNode || !pointer) {
              return;
            }

            applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
            const updatedPoint = getElementData(editableNode)?.points[drag.pointIndex];
            if (updatedPoint) {
              handle.position(localPointToWorld(editableNode, updatedPoint));
            }
            render.dynamicLayer.batchDraw();
          });
          handle.on("dragend", () => {
            const drag = activeHandleDrag;
            activeHandleDrag = null;
            if (!drag) {
              return;
            }

            const editableNode = findShape1dNodeById(render, drag.nodeId);
            if (!editableNode) {
              return;
            }

            const afterElement = toTElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            recordElementHistory(historyPortal, {
              beforeElement: drag.beforeElement,
              afterElement,
              label: "insert-shape1d-point",
            });
            renderEditHandles(editableNode);
          });
          handle.on("pointerclick", (event) => {
            if (activeHandleDrag) {
              return;
            }

            event.cancelBubble = true;
            const editableNode = findShape1dNodeById(render, node.id());
            const currentData = editableNode ? getElementData(editableNode) : null;
            if (!editableNode || !currentData) {
              return;
            }

            const beforeElement = toTElement(editableNode);
            const nextData = structuredClone(currentData);
            nextData.points.splice(index + 1, 0, insertPoint);
            editableNode.setAttr("vcElementData", nextData);
            editableNode.getLayer()?.batchDraw();
            const afterElement = toTElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            recordElementHistory(historyPortal, {
              beforeElement,
              afterElement,
              label: "insert-shape1d-point",
            });
            renderEditHandles(editableNode);
          });
          render.dynamicLayer.add(handle);
          insertHandles.push(handle);
        }

        anchorHandles.forEach((handle) => {
          handle.moveToTop();
        });
        insertHandles.forEach((handle) => {
          handle.moveToTop();
        });
        render.dynamicLayer.batchDraw();
      }

      function enterEditMode(node: TShape1dNode) {
        if (editor.editingShape1dId === node.id()) {
          renderEditHandles(node);
          return;
        }

        exitEditMode({ preserveSelection: true });
        node.setAttr("vcShape1dPrevDraggable", node.draggable());
        node.draggable(false);
        selection.setSelection([node]);
        selection.setFocusedNode(node);
        editor.setEditingShape1dId(node.id());
        renderEditHandles(node);
      }

      function refreshEditMode() {
        const editingId = editor.editingShape1dId;
        if (!editingId) {
          clearEditHandles();
          return;
        }

        const node = findShape1dNodeById(render, editingId);
        const filteredSelection = fxFilterSelection({
          render,
          selection: selection.selection,
        });
        if (!node || filteredSelection.length !== 1 || filteredSelection[0] !== node) {
          exitEditMode();
          return;
        }

        renderEditHandles(node);
      }

      function cancelDraft() {
        if (!previewShape && !draftStartPoint) {
          return;
        }

        resetDraft();
        resetPreview();
        editor.setActiveTool("select");
      }

      function setupNode(node: TShape1dNode) {
        attachShapeRuntime(node);
        setupShapeListeners(runtimePortal, node);
        node.setDraggable(true);
        node.listening(true);
        node.visible(true);
        return node;
      }

      function finalizeDraft() {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!currentTool()) {
          return;
        }

        const element = createDraftFromState();
        const currentPreviewShape = previewShape;
        resetDraft();
        resetPreview();
        editor.setActiveTool("select");
        if (!currentPreviewShape || !element) {
          return;
        }

        const node = setupNode(createShapeFromElement(theme, element));
        render.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        const createdElement = toTElement(node);
        crdt.patch({ elements: [createdElement], groups: [] });
        recordCreateHistory(historyPortal, {
          element: createdElement,
          node,
          label: "create-shape1d",
        });
        render.staticForegroundLayer.batchDraw();
      }

      contextMenu.registerProvider("shape1d", ({ targetElement, activeSelection }) => {
        if (!targetElement || !isSupportedElementType(targetElement.data.type)) {
          return [];
        }

        return [{
          id: "delete-shape1d-selection",
          label: "Delete",
          priority: 300,
          onSelect: () => {
            selection.setSelection(activeSelection);
            txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
          },
        }];
      });

      editor.registerTool({
        id: "arrow",
        label: "Arrow",
        icon: ArrowRight,
        shortcuts: ["5", "a"],
        priority: 50,
        behavior: { type: "mode", mode: "draw-create" },
      });
      editor.registerTool({
        id: "line",
        label: "Line",
        icon: Minus,
        shortcuts: ["6", "l"],
        priority: 60,
        behavior: { type: "mode", mode: "draw-create" },
      });

      editor.registerToElement("shape1d", (node) => {
        if (!(node instanceof render.Shape)) {
          return null;
        }

        if (!isShape1dNode(node)) {
          return null;
        }

        return toTElement(node);
      });

      editor.registerCreateShapeFromTElement("shape1d", (element) => {
        if (!element.data || !isSupportedElementType(element.data.type)) {
          return null;
        }

        return setupNode(createShapeFromElement(theme, element));
      });

      editor.registerSetupExistingShape("shape1d", (node) => {
        if (!(node instanceof render.Shape)) {
          return false;
        }

        if (!isShape1dNode(node)) {
          return false;
        }

        attachShapeRuntime(node);
        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("shape1d", (element) => {
        if (!element.data || !isSupportedElementType(element.data.type)) {
          return false;
        }

        const node = findShape1dNodeById(render, element.id);
        if (!node) {
          return false;
        }

        updateShapeFromElement(theme, node, element);
        return true;
      });

      ctx.hooks.pointerDown.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!currentTool()) {
          return;
        }

        const pointer = render.dynamicLayer.getRelativePointerPosition();
        if (!pointer) {
          return;
        }

        draftElementId = createId();
        draftStartPoint = [pointer.x, pointer.y];
        draftCurrentPoint = [pointer.x, pointer.y];
        syncPreview();
      });

      ctx.hooks.pointerMove.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!currentTool() || !draftStartPoint) {
          return;
        }

        const pointer = render.dynamicLayer.getRelativePointerPosition();
        if (!pointer) {
          return;
        }

        draftCurrentPoint = [pointer.x, pointer.y];
        syncPreview();
      });

      ctx.hooks.pointerUp.tap(() => {
        finalizeDraft();
      });

      ctx.hooks.pointerCancel.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE || !currentTool()) {
          return;
        }

        cancelDraft();
      });

      ctx.hooks.keydown.tap((event) => {
        if (event.key === "Escape"
          && selection.mode === CanvasMode.DRAW_CREATE
          && currentTool()
          && previewShape) {
          event.preventDefault();
          event.stopPropagation();
          cancelDraft();
          return;
        }

        if (event.key === "Enter"
          && selection.mode === CanvasMode.SELECT
          && editor.editingShape1dId === null) {
          const filteredSelection = fxFilterSelection({
            render,
            selection: selection.selection,
          });
          const target = filteredSelection.length === 1 && isShape1dNode(filteredSelection[0])
            && selection.focusedId === filteredSelection[0].id()
              ? filteredSelection[0]
              : null;
          if (!target) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          enterEditMode(target);
          return;
        }

        if (event.key !== "Escape" || editor.editingShape1dId === null) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        exitEditMode();
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        const filteredSelection = fxFilterSelection({
          render,
          selection: selection.selection,
        });
        if (!isShape1dNode(event.currentTarget) || filteredSelection.length !== 1 || filteredSelection[0] !== event.currentTarget) {
          return false;
        }

        enterEditMode(event.currentTarget);
        return true;
      });

      ctx.hooks.pointerDown.tap((event) => {
        if (selection.mode === CanvasMode.SELECT && editor.editingShape1dId !== null && event.target === render.stage) {
          exitEditMode();
        }
      });

      ctx.hooks.toolSelect.tap((toolId) => {
        if (isSupportedTool(toolId)) {
          return;
        }

        resetDraft();
        resetPreview();
      });

      editor.hooks.activeToolChange.tap((toolId) => {
        if (toolId !== previousToolId) {
          resetDraft();
          resetPreview();
        }
        previousToolId = toolId;
      });

      selection.hooks.change.tap(() => {
        refreshEditMode();
      });
      camera.hooks.change.tap(() => {
        refreshEditMode();
      });
      editor.hooks.editingShape1dChange.tap(() => {
        refreshEditMode();
      });
      theme.hooks.change.tap(() => {
        render.staticForegroundLayer.find((candidate: Konva.Node) => {
          return isShape1dNode(candidate);
        }).forEach((candidate) => {
          if (!isShape1dNode(candidate)) {
            return;
          }

          const element = toTElement(candidate);
          updateShapeFromElement(theme, candidate, element);
        });
        render.staticForegroundLayer.batchDraw();
        refreshEditMode();
      });

      ctx.hooks.destroy.tap(() => {
        resetDraft();
        resetPreview();
        clearEditHandles();
        activeHandleDrag = null;
        editor.setEditingShape1dId(null);
        contextMenu.unregisterProvider("shape1d");
        editor.unregisterTool("arrow");
        editor.unregisterTool("line");
        editor.unregisterToElement("shape1d");
        editor.unregisterCreateShapeFromTElement("shape1d");
        editor.unregisterSetupExistingShape("shape1d");
        editor.unregisterUpdateShapeFromTElement("shape1d");
      });
    },
  };
}

export const Shape1dPlugin = {
  isSupportedTool,
  isSupportedElementType,
  findShape1dNodeById,
  getElementData,
  isShape1dNode,
  hasRenderableRuntime,
  createShapeFromElement,
  updateShapeFromElement,
  toTElement,
  createPreviewClone,
  createCloneDrag,
  finalizePreviewClone,
  setupShapeListeners,
  safeStopDrag,
};
