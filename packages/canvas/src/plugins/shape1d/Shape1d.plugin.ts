import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import ArrowRight from "lucide-static/icons/arrow-right.svg?raw";
import Konva from "konva";
import Minus from "lucide-static/icons/minus.svg?raw";
import { throttle } from "@solid-primitives/scheduled";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { DEFAULT_STROKE_WIDTHS } from "../../components/SelectionStyleMenu/types";
import { txSetNodeZIndex } from "../../core/tx.set-node-z-index";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import type { IRuntimeHooks } from "../../runtime";
import type { CameraService } from "../../services/camera/CameraService";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import type { SelectionService } from "../../services/selection/SelectionService";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { txFinalizeOwnedTransform } from "../../core/tx.finalize-owned-transform";
import {
  DEFAULT_OPACITY,
  DEFAULT_STROKE_COLOR_TOKEN,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_STROKE_WIDTH_TOKEN,
  EDIT_HANDLE_FILL,
  EDIT_HANDLE_RADIUS,
  EDIT_HANDLE_STROKE,
  INSERT_HANDLE_RADIUS,
  type THandleDragSnapshot,
  type TPoint,
  type TShape1dNode,
} from "./CONSTANTS";
import { fxCreateDraftElement, fxCreateFallbackPreviewElement } from "./fn.draft";
import { fxApplyAnchorDrag, fxGetInsertionPoint, fxLocalPointToWorld } from "./fx.geometry";
import {
  fxFindShape1dNodeById,
  fxGetElementData,
  fxHasRenderableRuntime,
  fxIsShape1dNode,
  fxIsSupportedElementType,
  fxIsSupportedTool,
  fxToPositionPatch,
  fxToTElement,
} from "./fx.node";
import { txCreatePreviewClone, txUpdateShapeFromElement } from "./tx.element";
import { txRecordCreateHistory, txRecordElementHistory, type TPortalTxRecordShape1dHistory } from "./tx.history";
import { txAttachShapeRuntime, txCreateShapeFromElement } from "./tx.render";
import { txCreateCloneDrag, txSetupShapeListeners } from "./tx.runtime";

const TRANSFORM_MOVE_BEFORE_ELEMENT_ATTR = "vcTransformMoveBeforeElement";
const TRANSFORM_BEFORE_ELEMENT_ATTR = "vcTransformBeforeElement";
const SHAPE1D_MOVE_BEFORE_ELEMENT_ATTR = "vcShape1dMoveBeforeElement";
const MOVE_PATCH_INTERVAL_MS = 100;

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

function getTypedShape1dNode(node: Konva.Node | null | undefined): TShape1dNode | null {
  return fxIsShape1dNode({ Shape: Konva.Shape }, { node }) ? (node as TShape1dNode) : null;
}

/**
 * Owns line/arrow registration, create flow, edit handles, clone-drag,
 * transform ownership, and CanvasRegistry integration for 1d shapes.
 */
export function createShape1dPlugin(): IPlugin<{
  camera: CameraService;
  canvasRegistry: CanvasRegistryService;
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IRuntimeHooks> {
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
      const canvasRegistry = ctx.services.require("canvasRegistry");
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
      const moveSessions = new Map<string, {
        beforeElement: TElement;
        throttledPatch: (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void;
      }>();

      const createShapeNode = (config?: Record<string, unknown>) => {
        return new Konva.Shape({
          perfectDrawEnabled: false,
          lineCap: "round",
          lineJoin: "round",
          ...config,
        }) as TShape1dNode;
      };
      const findNode = (id: string): TShape1dNode | null => fxFindShape1dNodeById({ Shape: Konva.Shape, render }, { id }) ?? null;
      const getData = (node: TShape1dNode) => fxGetElementData({}, { node });
      const isNode = (node: Konva.Node | null | undefined): node is TShape1dNode => fxIsShape1dNode({ Shape: Konva.Shape }, { node });
      const isTool = (tool: string): tool is "line" | "arrow" => fxIsSupportedTool({}, { tool });
      const isType = (type: string): boolean => fxIsSupportedElementType({}, { type });
      const toWorld = (node: TShape1dNode, point: TPoint | { x: number; y: number }) => fxLocalPointToWorld({}, { node, point });
      const insertionPoint = (data: Parameters<typeof fxGetInsertionPoint>[1]["data"], segmentIndex: number) => fxGetInsertionPoint({}, { data, segmentIndex });
      const applyAnchorDrag = (node: TShape1dNode, drag: THandleDragSnapshot, worldPoint: { x: number; y: number }) => fxApplyAnchorDrag({}, { node, drag, worldPoint });
      const createShape = (element: TElement) => txCreateShapeFromElement({ createShapeNode, setNodeZIndex, theme, resolveThemeColor }, { element });
      const updateShape = (node: TShape1dNode, element: TElement) => txUpdateShapeFromElement({ theme, resolveThemeColor, setNodeZIndex }, { node, element });
      const toElement = (node: TShape1dNode) => fxToTElement({ editor: canvasRegistry, now }, { node });
      const applyElement = (element: TElement) => {
        const didUpdate = canvasRegistry.updateElement(element);
        if (!didUpdate) {
          return;
        }

        render.staticForegroundLayer.batchDraw();
      };

      const historyPortal: TPortalTxRecordShape1dHistory = {
        Shape: Konva.Shape,
        canvasRegistry,
        crdt,
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
        createThrottledPatch: (callback: (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void) => throttle(callback, MOVE_PATCH_INTERVAL_MS),
      };

      function currentTool() {
        return isTool(editor.activeToolId) ? editor.activeToolId : null;
      }

      function getRememberedStyle(tool: "line" | "arrow" | null) {
        return tool ? theme.getRememberedStyle(tool) : {};
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
          rememberedStyle: getRememberedStyle(tool),
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
          rememberedStyle: getRememberedStyle(tool),
        });
      }

      function resetDraft() {
        draftElementId = null;
        draftStartPoint = null;
        draftCurrentPoint = null;
      }

      function resetPreview() {
        previewShape?.destroy();
        previewShape = null;
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
          editor: canvasRegistry,
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
        resetDraft();
        resetPreview();
        editor.setActiveTool("select");
        if (!element) {
          return;
        }

        const node = setupNode(createShape(element));
        render.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        txRecordCreateHistory(historyPortal, {
          element: toElement(node),
          node,
          label: "create-shape1d",
        });
        render.staticForegroundLayer.batchDraw();
      }

      const txBeginShapeMove = (node: TShape1dNode, beforeElement?: TElement | null) => {
        const resolvedBeforeElement = beforeElement ? structuredClone(beforeElement) : structuredClone(toElement(node));
        node.setAttr(SHAPE1D_MOVE_BEFORE_ELEMENT_ATTR, structuredClone(resolvedBeforeElement));
        moveSessions.set(node.id(), {
          beforeElement: resolvedBeforeElement,
          throttledPatch: throttle((patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => {
            const builder = crdt.build();
            builder.patchElement(patch.id, "x", patch.x);
            builder.patchElement(patch.id, "y", patch.y);
            builder.patchElement(patch.id, "parentGroupId", patch.parentGroupId);
            builder.patchElement(patch.id, "updatedAt", patch.updatedAt);
            builder.commit();
          }, MOVE_PATCH_INTERVAL_MS),
        });
      };

      const txEnsureShapeMove = (node: TShape1dNode) => {
        const existingSession = moveSessions.get(node.id());
        if (existingSession) {
          return existingSession;
        }

        const beforeElement = node.getAttr(SHAPE1D_MOVE_BEFORE_ELEMENT_ATTR) as TElement | undefined;
        const transformBeforeElement = node.getAttr(TRANSFORM_MOVE_BEFORE_ELEMENT_ATTR) as TElement | undefined;
        txBeginShapeMove(node, beforeElement ?? transformBeforeElement ?? null);
        return moveSessions.get(node.id()) ?? null;
      };

      const txPatchShapeMove = (node: TShape1dNode) => {
        const session = txEnsureShapeMove(node);
        if (!session) {
          return false;
        }

        session.throttledPatch(fxToPositionPatch({ editor: canvasRegistry, now }, { node }));
        return true;
      };

      const txFinalizeShapeMove = (node: TShape1dNode) => {
        const session = moveSessions.get(node.id());
        moveSessions.delete(node.id());
        node.setAttr(SHAPE1D_MOVE_BEFORE_ELEMENT_ATTR, undefined);
        if (!session) {
          return false;
        }

        const beforeElement = structuredClone(session.beforeElement);
        const afterElement = structuredClone(toElement(node));
        const moveCommitResult = (() => {
          const builder = crdt.build();
          builder.patchElement(afterElement.id, afterElement);
          return builder.commit();
        })();

        const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
        if (!didMove) {
          return true;
        }

        history.record({
          label: "drag-shape1d",
          undo: () => {
            applyElement(beforeElement);
            moveCommitResult.rollback();
          },
          redo: () => {
            applyElement(afterElement);
            crdt.applyOps({ ops: moveCommitResult.redoOps });
          },
        });

        return true;
      };

      const unregisterShape1dBase = canvasRegistry.registerElement({
        id: "shape1d-base",
        matchesElement: (element) => element.data.type === "line" || element.data.type === "arrow",
        matchesNode: (node) => isNode(node),
        toElement: (node) => {
          if (!isNode(node)) {
            return null;
          }

          return toElement(node);
        },
        createNode: (element) => {
          if (!isType(element.data.type)) {
            return null;
          }

          return createShape(element);
        },
        attachListeners: (node) => {
          if (!isNode(node)) {
            return false;
          }

          setupNode(node);
          return true;
        },
        updateElement: (element) => {
          if (!isType(element.data.type)) {
            return false;
          }

          const node = findNode(element.id);
          if (!node) {
            return false;
          }

          updateShape(node, element);
          return true;
        },
        createDragClone: ({ node }) => {
          if (!isNode(node)) {
            return false;
          }

          txCreateCloneDrag(runtimePortal, { node });
          return true;
        },
        getTransformOptions: () => ({
          enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
          keepRatio: false,
          flipEnabled: false,
        }),
        onMove: ({ node }) => {
          const shapeNode = getTypedShape1dNode(node);
          if (!shapeNode) {
            return { cancel: false, crdt: false };
          }

          txEnsureShapeMove(shapeNode);
          txPatchShapeMove(shapeNode);
          return { cancel: true, crdt: false };
        },
        afterMove: ({ node }) => {
          const shapeNode = getTypedShape1dNode(node);
          if (!shapeNode) {
            return { cancel: false, crdt: false };
          }

          txFinalizeShapeMove(shapeNode);
          return { cancel: true, crdt: false };
        },
        afterResize: ({ node }) => ({
          cancel: node instanceof Konva.Shape && isNode(node)
            ? txFinalizeOwnedTransform({
              crdt,
              history,
              applyElement,
              serializeAfterElement: (candidateNode) => {
                const shapeNode = getTypedShape1dNode(candidateNode);
                if (!shapeNode) {
                  return null;
                }

                const element = toElement(shapeNode);
                updateShape(shapeNode, element);
                return structuredClone(element);
              },
            }, {
              node,
              label: "transform-shape1d",
              beforeAttr: TRANSFORM_BEFORE_ELEMENT_ATTR,
            })
            : false,
          crdt: false,
        }),
        afterRotate: ({ node }) => ({
          cancel: node instanceof Konva.Shape && isNode(node)
            ? txFinalizeOwnedTransform({
              crdt,
              history,
              applyElement,
              serializeAfterElement: (candidateNode) => {
                const shapeNode = getTypedShape1dNode(candidateNode);
                if (!shapeNode) {
                  return null;
                }

                const element = toElement(shapeNode);
                updateShape(shapeNode, element);
                return structuredClone(element);
              },
            }, {
              node,
              label: "rotate-shape1d",
              beforeAttr: TRANSFORM_BEFORE_ELEMENT_ATTR,
            })
            : false,
          crdt: false,
        }),
      });

      const unregisterLine = canvasRegistry.registerElement({
        id: "line",
        matchesElement: (element) => element.data.type === "line",
        getSelectionStyleMenu: () => ({
          sections: {
            showStrokeColorPicker: true,
            showStrokeWidthPicker: true,
            showOpacityPicker: true,
            showLineTypePicker: true,
          },
          values: {
            strokeColor: DEFAULT_STROKE_COLOR_TOKEN,
            strokeWidth: DEFAULT_STROKE_WIDTH_TOKEN,
            opacity: DEFAULT_OPACITY,
            lineType: "straight",
          },
          strokeWidthOptions: [...DEFAULT_STROKE_WIDTHS],
        }),
      });

      const unregisterArrow = canvasRegistry.registerElement({
        id: "arrow",
        matchesElement: (element) => element.data.type === "arrow",
        getSelectionStyleMenu: () => ({
          sections: {
            showStrokeColorPicker: true,
            showStrokeWidthPicker: true,
            showOpacityPicker: true,
            showLineTypePicker: true,
            showStartCapPicker: true,
            showEndCapPicker: true,
          },
          values: {
            strokeColor: DEFAULT_STROKE_COLOR_TOKEN,
            strokeWidth: DEFAULT_STROKE_WIDTH_TOKEN,
            opacity: DEFAULT_OPACITY,
            lineType: "straight",
            startCap: "none",
            endCap: "arrow",
          },
          strokeWidthOptions: [...DEFAULT_STROKE_WIDTHS],
        }),
      });

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
            txDeleteSelection({ Group: Konva.Group, Shape: Konva.Shape, Layer: Konva.Layer, canvasRegistry, crdt, history, render, renderOrder, selection }, {});
          },
        }];
      });

      ctx.hooks.init.tap(() => {
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
            editor: canvasRegistry,
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
          editor: canvasRegistry,
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

          updateShape(candidate, toElement(candidate));
        });
        render.staticForegroundLayer.batchDraw();
        refreshEditMode();
      });

      ctx.hooks.destroy.tap(() => {
        resetDraft();
        resetPreview();
        clearEditHandles();
        activeHandleDrag = null;
        moveSessions.clear();
        editor.setEditingShape1dId(null);
        contextMenu.unregisterProvider("shape1d");
        unregisterShape1dBase();
        unregisterLine();
        unregisterArrow();
        editor.unregisterTool("arrow");
        editor.unregisterTool("line");
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
  txSetupShapeListeners,
};
