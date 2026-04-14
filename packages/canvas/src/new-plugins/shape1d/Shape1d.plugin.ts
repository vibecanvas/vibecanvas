import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import ArrowRight from "lucide-static/icons/arrow-right.svg?raw";
import Konva from "konva";
import Minus from "lucide-static/icons/minus.svg?raw";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { CanvasMode } from "../../new-services/selection/CONSTANTS";
import { throttle } from "@solid-primitives/scheduled";
import type { IHooks } from "../../runtime";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { txSetNodeZIndex } from "../../core/tx.set-node-z-index";
import { fxCreateDraftElement, fxCreateFallbackPreviewElement } from "./fn.draft";
import { txCreatePreviewClone, txUpdateShapeFromElement } from "./tx.element";
import { fxApplyAnchorDrag, fxGetInsertionPoint, fxLocalPointToWorld } from "./fx.geometry";
import { txRecordCreateHistory, txRecordElementHistory, type TPortalTxRecordShape1dHistory } from "./tx.history";
import { txAttachShapeRuntime, txCreateShapeFromElement } from "./tx.render";
import { txCreateCloneDrag, txFinalizePreviewClone, txSafeStopDrag, txSetupShapeListeners } from "./tx.runtime";
import { fxFindShape1dNodeById, fxGetElementData, fxHasRenderableRuntime, fxIsShape1dNode, fxIsSupportedElementType, fxIsSupportedTool, fxToTElement } from "./fx.node";
import {
  EDIT_HANDLE_FILL,
  EDIT_HANDLE_RADIUS,
  EDIT_HANDLE_STROKE,
  INSERT_HANDLE_RADIUS,
  type THandleDragSnapshot,
  type TPoint,
  type TShape1dNode,
} from "./CONSTANTS";

const setNodeZIndex = (node: Konva.Group | Konva.Shape, zIndex: string) => txSetNodeZIndex({}, { node, zIndex });

function createCreateId(render: SceneService) {
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
  scene: SceneService;
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
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      previousToolId = editor.activeToolId;
      const createId = createCreateId(render);
      const now = () => Date.now();

      const createShapeNode = (config?: Record<string, unknown>) => {
        return new Konva.Shape({
          perfectDrawEnabled: false,
          lineCap: "round",
          lineJoin: "round",
          ...config,
        }) as TShape1dNode;
      };
      const toElement = (node: TShape1dNode) => fxToTElement({ editor, now }, { node });
      const findNode = (id: string): TShape1dNode | null => fxFindShape1dNodeById({ Shape: Konva.Shape, render }, { id });
      const getData = (node: TShape1dNode) => fxGetElementData({}, { node });
      const isNode = (node: Konva.Node | null | undefined): node is TShape1dNode => fxIsShape1dNode({ Shape: Konva.Shape }, { node });
      const isTool = (tool: string): tool is "line" | "arrow" => fxIsSupportedTool({}, { tool });
      const isType = (type: string): boolean => fxIsSupportedElementType({}, { type });
      const toWorld = (node: TShape1dNode, point: TPoint | { x: number; y: number }) => fxLocalPointToWorld({}, { node, point });
      const insertionPoint = (data: Parameters<typeof fxGetInsertionPoint>[1]["data"], segmentIndex: number) => fxGetInsertionPoint({}, { data, segmentIndex });
      const applyAnchorDrag = (node: TShape1dNode, drag: THandleDragSnapshot, worldPoint: { x: number; y: number }) => fxApplyAnchorDrag({}, { node, drag, worldPoint });
      const createShape = (element: import("@vibecanvas/service-automerge/types/canvas-doc.types").TElement) => txCreateShapeFromElement({ createShapeNode, setNodeZIndex, theme, resolveThemeColor }, { element });
      const updateShape = (node: TShape1dNode, element: import("@vibecanvas/service-automerge/types/canvas-doc.types").TElement) => txUpdateShapeFromElement({ theme, resolveThemeColor, setNodeZIndex }, { node, element });

      const historyPortal: TPortalTxRecordShape1dHistory = {
        Shape: Konva.Shape,
        crdt,
        editor,
        history,
        render,
        renderOrder,
        selection,
        theme,
        resolveThemeColor,
        createShapeNode,
        setNodeZIndex,
        setupNode,
      };

      const runtimePortal = {
        ...historyPortal,
        Konva,
        hooks: ctx.hooks,
        createId,
        now,
        createThrottledPatch: (callback: (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void) => throttle(callback, 100),
      };

      function currentTool() {
        return isTool(editor.activeToolId) ? editor.activeToolId : null;
      }

      function createDraftFromState() {
        const tool = currentTool();
        if (!tool) {
          return null;
        }

        return fxCreateDraftElement({
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

        return fxCreateFallbackPreviewElement({
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

        previewShape = createShape(previewElement);
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

        updateShape(nextPreviewShape, element);
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
        const data = getData(node);
        if (!data) {
          return;
        }

        anchorHandles.forEach((handle, pointIndex) => {
          const point = data.points[pointIndex];
          if (point) {
            handle.position(toWorld(node, point));
          }
        });
        insertHandles.forEach((handle, segmentIndex) => {
          handle.position(toWorld(node, insertionPoint(data, segmentIndex)));
        });
        render.dynamicLayer.batchDraw();
      }

      function exitEditMode(args?: { preserveSelection?: boolean }) {
        const editingId = editor.editingShape1dId;
        if (editingId !== null) {
          const node = findNode(editingId);
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
        const data = getData(node);
        if (!data || data.points.length === 0) {
          return;
        }

        data.points.forEach((point, pointIndex) => {
          const worldPoint = toWorld(node, point);
          const handle = new Konva.Circle({
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
            const editableNode = findNode(node.id());
            if (!editableNode) {
              return;
            }

            activeHandleDrag = {
              nodeId: editableNode.id(),
              pointIndex,
              beforeElement: toElement(editableNode),
              beforePoints: structuredClone(getData(editableNode)?.points ?? []),
              beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy(),
            };
          });
          handle.on("dragmove", () => {
            const drag = activeHandleDrag;
            if (!drag) {
              return;
            }

            const editableNode = findNode(drag.nodeId);
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

            const editableNode = findNode(drag.nodeId);
            if (!editableNode) {
              return;
            }

            const afterElement = toElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            txRecordElementHistory(historyPortal, {
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
          const insertPoint = insertionPoint(data, index);
          const worldPoint = toWorld(node, insertPoint);
          const handle = new Konva.Circle({
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
            const editableNode = findNode(node.id());
            if (!editableNode) {
              return;
            }

            const beforeElement = toElement(editableNode);
            const currentData = getData(editableNode);
            if (!currentData) {
              return;
            }

            const createdPoint = insertionPoint(currentData, index);
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

            const editableNode = findNode(drag.nodeId);
            const pointer = render.dynamicLayer.getRelativePointerPosition();
            if (!editableNode || !pointer) {
              return;
            }

            applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
            const updatedPoint = getData(editableNode)?.points[drag.pointIndex];
            if (updatedPoint) {
              handle.position(toWorld(editableNode, updatedPoint));
            }
            render.dynamicLayer.batchDraw();
          });
          handle.on("dragend", () => {
            const drag = activeHandleDrag;
            activeHandleDrag = null;
            if (!drag) {
              return;
            }

            const editableNode = findNode(drag.nodeId);
            if (!editableNode) {
              return;
            }

            const afterElement = toElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            txRecordElementHistory(historyPortal, {
              beforeElement: drag.beforeElement,
              afterElement,
              label: "insert-shape1d-point",
            });
            renderEditHandles(editableNode);
          });
          handle.on("pointerclick", (event: Konva.KonvaEventObject<PointerEvent>) => {
            if (activeHandleDrag) {
              return;
            }

            event.cancelBubble = true;
            const editableNode = findNode(node.id());
            const currentData = editableNode ? getData(editableNode) : null;
            if (!editableNode || !currentData) {
              return;
            }

            const beforeElement = toElement(editableNode);
            const nextData = structuredClone(currentData);
            nextData.points.splice(index + 1, 0, insertPoint);
            editableNode.setAttr("vcElementData", nextData);
            editableNode.getLayer()?.batchDraw();
            const afterElement = toElement(editableNode);
            crdt.patch({ elements: [afterElement], groups: [] });
            txRecordElementHistory(historyPortal, {
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

        const node = findNode(editingId);
        const filteredSelection = fxFilterSelection({ Konva }, {
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
        txAttachShapeRuntime({}, { node });
        txSetupShapeListeners(runtimePortal, { node });
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

        const node = setupNode(createShape(element));
        render.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        const createdElement = toElement(node);
        crdt.patch({ elements: [createdElement], groups: [] });
        txRecordCreateHistory(historyPortal, {
          element: createdElement,
          node,
          label: "create-shape1d",
        });
        render.staticForegroundLayer.batchDraw();
      }

      contextMenu.registerProvider("shape1d", ({ targetElement, activeSelection }) => {
        if (!targetElement || !isType(targetElement.data.type)) {
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
        if (!(node instanceof Konva.Shape)) {
          return null;
        }

        if (!isNode(node)) {
          return null;
        }

        return toElement(node);
      });

      editor.registerCreateShapeFromTElement("shape1d", (element) => {
        if (!element.data || !isType(element.data.type)) {
          return null;
        }

        return setupNode(createShape(element));
      });

      editor.registerSetupExistingShape("shape1d", (node) => {
        if (!(node instanceof Konva.Shape)) {
          return false;
        }

        if (!isNode(node)) {
          return false;
        }

        txAttachShapeRuntime({}, { node });
        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("shape1d", (element) => {
        if (!element.data || !isType(element.data.type)) {
          return false;
        }

        const node = findNode(element.id);
        if (!node) {
          return false;
        }

        updateShape(node, element);
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
          const filteredSelection = fxFilterSelection({ Konva }, {
            selection: selection.selection,
          });
          const target = filteredSelection.length === 1 && isNode(filteredSelection[0])
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
        const filteredSelection = fxFilterSelection({ Konva }, {
          selection: selection.selection,
        });
        if (!isNode(event.currentTarget) || filteredSelection.length !== 1 || filteredSelection[0] !== event.currentTarget) {
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
        if (isTool(toolId)) {
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
          return isNode(candidate);
        }).forEach((candidate) => {
          if (!isNode(candidate)) {
            return;
          }

          const element = toElement(candidate);
          updateShape(candidate, element);
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
  fxIsSupportedTool,
  fxIsSupportedElementType,
  fxFindShape1dNodeById,
  fxGetElementData,
  fxIsShape1dNode,
  fxHasRenderableRuntime,
  txCreateShapeFromElement,
  txUpdateShapeFromElement,
  fxToTElement,
  txCreatePreviewClone,
  txCreateCloneDrag,
  txFinalizePreviewClone,
  txSetupShapeListeners,
  txSafeStopDrag,
};
