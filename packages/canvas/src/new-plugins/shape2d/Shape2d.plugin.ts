import { throttle } from "@solid-primitives/scheduled";
import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Circle from "lucide-static/icons/circle.svg?raw";
import Diamond from "lucide-static/icons/diamond.svg?raw";
import Konva from "konva";
import Square from "lucide-static/icons/square.svg?raw";
import { fnCreateShape2dElement, fnGetShape2dDraftBounds, fnGetShape2dElementTypeFromTool, fnIsShape2dElementType, fnIsShape2dToolId, type TShape2dToolId } from "../../core/fn.shape2d";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { txSetNodeZIndex } from "../../core/tx.set-node-z-index";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { ThemeService } from "@vibecanvas/service-theme";
import { CanvasMode } from "../../new-services/selection/CONSTANTS";
import type { IHooks } from "../../runtime";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { fxGetAttachedTextNode, fxOpenAttachedTextEditMode, fxPersistAttachedTextNode, fxSyncAttachedTextNodeToShape } from "./fx.attached-text";
import { fxCreateShape2dNode } from "./fx.create-node";
import { fxToShape2dElement } from "./fx.to-element";
import { fxGetShape2dNodeType } from "./fn.node";
import { txCreateShape2dCloneDrag } from "./tx.create-clone-drag";
import { txSetupShape2dNode } from "./tx.setup-node";
import { txUpdateShape2dNodeFromElement } from "./tx.update-node-from-element";

const setNodeZIndex = (node: Konva.Group | Konva.Shape, zIndex: string) => txSetNodeZIndex({}, { node, zIndex });

function createCreateId(render: SceneService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `shape2d-${Date.now()}-${fallbackId}`;
  };
}

function safeStopDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

function isShape2dTextHostNode(render: SceneService, node: Konva.Node | null | undefined): node is Konva.Shape {
  return Boolean(node)
    && node instanceof render.Shape
    && fxGetShape2dNodeType({ render, node }) !== null;
}

function getFocusedShape2dTextHost(render: SceneService, editor: EditorService, selection: SelectionService) {
  const filtered = fxFilterSelection({ Konva }, { editor, selection: selection.selection });
  if (filtered.length !== 1) {
    return null;
  }

  const candidate = filtered[0];
  return isShape2dTextHostNode(render, candidate) ? candidate : null;
}

/**
 * Owns rectangle, diamond, and ellipse runtime behavior.
 * Uses editor tool registry for toolbar shortcuts and scene hydration hooks.
 */
export function createShape2dPlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "shape2d",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const createId = createCreateId(render);
      const now = () => Date.now();

      let previewNode: Konva.Shape | null = null;
      let previewOrigin: { x: number; y: number } | null = null;
      let previewToolId: TShape2dToolId | null = null;

      const toElement = (node: Konva.Node) => {
        return fxToShape2dElement({
          editor,
          render,
          now,
        }, {
          node,
        });
      };

      const createNode = (element: TElement) => {
        return fxCreateShape2dNode({
          render,
          theme,
          setNodeZIndex,
        }, {
          element,
        });
      };

      const syncShapeAttachedText = (shapeNode: Konva.Shape) => {
        const textNode = fxGetAttachedTextNode({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, shapeNode);
        if (!textNode) {
          return null;
        }

        fxSyncAttachedTextNodeToShape({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, shapeNode, textNode);
        return fxPersistAttachedTextNode({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, textNode);
      };

      const setupNode = (node: Konva.Shape) => {
        txSetupShape2dNode({
          crdt,
          editor,
          history,
          render,
          selection,
          hooks: ctx.hooks,
          createCloneDrag: (sourceNode) => {
            return txCreateShape2dCloneDrag({
              crdt,
              history,
              render,
              renderOrder,
              selection,
              createId,
              now,
              createNode,
              setupNode,
              toElement,
              cloneLinkedNodes: ({ sourceNode: sourceShape, clonedNode }) => {
                if (!isShape2dTextHostNode(render, sourceShape) || !isShape2dTextHostNode(render, clonedNode)) {
                  return { nodes: [], elements: [] };
                }

                const sourceTextNode = fxGetAttachedTextNode({
                  crdt,
                  document: render.container.ownerDocument,
                  editor,
                  history,
                  render,
                  renderOrder,
                  selection,
                  theme,
                  createId,
                  now,
                }, sourceShape);
                if (!sourceTextNode) {
                  return { nodes: [], elements: [] };
                }

                const sourceTextElement = editor.toElement(sourceTextNode);
                if (!sourceTextElement || sourceTextElement.data.type !== "text") {
                  return { nodes: [], elements: [] };
                }

                const timestamp = now();
                const clonedTextNode = editor.createShapeFromTElement({
                  ...sourceTextElement,
                  id: createId(),
                  x: clonedNode.x(),
                  y: clonedNode.y(),
                  rotation: clonedNode.rotation(),
                  parentGroupId: null,
                  createdAt: timestamp,
                  updatedAt: timestamp,
                  zIndex: "",
                  data: {
                    ...sourceTextElement.data,
                    containerId: clonedNode.id(),
                    originalText: sourceTextElement.data.text,
                  },
                });
                if (!(clonedTextNode instanceof render.Text)) {
                  return { nodes: [], elements: [] };
                }

                render.staticForegroundLayer.add(clonedTextNode);
                fxSyncAttachedTextNodeToShape({
                  crdt,
                  document: render.container.ownerDocument,
                  editor,
                  history,
                  render,
                  renderOrder,
                  selection,
                  theme,
                  createId,
                  now,
                }, clonedNode, clonedTextNode);
                renderOrder.assignOrderOnInsert({
                  parent: render.staticForegroundLayer,
                  nodes: [clonedNode, clonedTextNode],
                  position: "front",
                });
                const clonedTextElement = editor.toElement(clonedTextNode);
                return clonedTextElement && clonedTextElement.data.type === "text"
                  ? { nodes: [clonedTextNode], elements: [clonedTextElement] }
                  : { nodes: [clonedTextNode], elements: [] };
              },
            }, {
              node: sourceNode,
            });
          },
          filterSelection: (nodes) => {
            return fxFilterSelection({
              Konva,
            }, {
              editor,
              selection: nodes.filter((candidate): candidate is Konva.Group | Konva.Shape => {
                return candidate instanceof render.Group || candidate instanceof render.Shape;
              }),
            });
          },
          safeStopDrag,
          toElement,
          createThrottledPatch: () => {
            return throttle((element: TElement) => {
              crdt.patch({ elements: [element], groups: [] });
            }, 100);
          },
          onNodeDragMove: (dragNode) => {
            if (isShape2dTextHostNode(render, dragNode)) {
              syncShapeAttachedText(dragNode);
            }
          },
          onNodeDragEnd: (dragNode) => {
            if (isShape2dTextHostNode(render, dragNode)) {
              syncShapeAttachedText(dragNode);
            }
          },
          onNodeTransform: (transformNode) => {
            if (isShape2dTextHostNode(render, transformNode)) {
              syncShapeAttachedText(transformNode);
            }
          },
        }, {
          node,
        });
        return node;
      };

      const clearPreviewState = () => {
        previewNode = null;
        previewOrigin = null;
        previewToolId = null;
        editor.setPreviewNode(null);
      };

      const destroyPreview = () => {
        previewNode?.destroy();
        clearPreviewState();
        render.dynamicLayer.batchDraw();
      };

      const cancelCreate = () => {
        destroyPreview();
        editor.setActiveTool("select");
      };

      const commitPreview = () => {
        if (!previewNode) {
          return;
        }

        const createdNode = previewNode;
        clearPreviewState();
        createdNode.moveTo(render.staticForegroundLayer);
        setupNode(createdNode);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [createdNode],
          position: "front",
        });

        const element = toElement(createdNode);
        if (!element) {
          createdNode.destroy();
          editor.setActiveTool("select");
          render.staticForegroundLayer.batchDraw();
          return;
        }

        crdt.patch({ elements: [element], groups: [] });
        selection.setSelection([createdNode]);
        selection.setFocusedNode(createdNode);
        editor.setActiveTool("select");
        render.dynamicLayer.batchDraw();
        render.staticForegroundLayer.batchDraw();
      };

      renderOrder.registerBundleResolver("shape2d", (node) => {
        if (!isShape2dTextHostNode(render, node)) {
          return null;
        }

        const textNode = fxGetAttachedTextNode({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, node);
        if (!textNode || textNode.getParent() !== node.getParent()) {
          return [node];
        }

        return [node, textNode];
      });

      contextMenu.registerProvider("shape2d", ({ targetElement, activeSelection }) => {
        if (!targetElement || !fnIsShape2dElementType(targetElement.data.type)) {
          return [];
        }

        return [{
          id: "delete-shape2d-selection",
          label: "Delete",
          priority: 300,
          onSelect: () => {
            selection.setSelection(activeSelection);
            txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
          },
        }];
      });

      editor.registerTool({
        id: "rectangle",
        label: "Rectangle",
        icon: Square,
        shortcuts: ["2", "r"],
        priority: 20,
        behavior: { type: "mode", mode: "draw-create" },
      });
      editor.registerTool({
        id: "diamond",
        label: "Diamond",
        icon: Diamond,
        shortcuts: ["3", "d"],
        priority: 30,
        behavior: { type: "mode", mode: "draw-create" },
      });
      editor.registerTool({
        id: "ellipse",
        label: "Ellipse",
        icon: Circle,
        shortcuts: ["4", "o"],
        priority: 40,
        behavior: { type: "mode", mode: "draw-create" },
      });

      editor.registerToElement("shape2d", (node) => {
        return toElement(node);
      });

      editor.registerCreateShapeFromTElement("shape2d", (element) => {
        if (!fnIsShape2dElementType(element.data.type)) {
          return null;
        }

        const node = createNode(element);
        if (!node) {
          return null;
        }

        return setupNode(node);
      });

      editor.registerSetupExistingShape("shape2d", (node) => {
        if (!fxGetShape2dNodeType({ render, node })) {
          return false;
        }

        setupNode(node as Konva.Shape);
        return true;
      });

      editor.registerUpdateShapeFromTElement("shape2d", (element) => {
        if (!fnIsShape2dElementType(element.data.type)) {
          return false;
        }

        const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return candidate instanceof render.Shape && candidate.id() === element.id;
        });
        if (!(node instanceof render.Shape)) {
          return false;
        }

        const didUpdate = txUpdateShape2dNodeFromElement({
          render,
          theme,
          setNodeZIndex,
        }, {
          node,
          element,
        });
        if (!didUpdate) {
          return false;
        }

        if (isShape2dTextHostNode(render, node)) {
          syncShapeAttachedText(node);
        }

        return true;
      });

      ctx.hooks.toolSelect.tap((toolId) => {
        if (previewNode && toolId !== previewToolId) {
          destroyPreview();
        }

        if (fnIsShape2dToolId(toolId)) {
          selection.clear();
        }
      });

      ctx.hooks.pointerDown.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!fnIsShape2dToolId(editor.activeToolId)) {
          return;
        }

        if (previewNode) {
          return;
        }

        const pointer = render.dynamicLayer.getRelativePointerPosition();
        if (!pointer) {
          return;
        }

        const timestamp = now();
        const element = fnCreateShape2dElement({
          id: createId(),
          type: fnGetShape2dElementTypeFromTool(editor.activeToolId),
          x: pointer.x,
          y: pointer.y,
          rotation: 0,
          width: 0,
          height: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          parentGroupId: null,
          zIndex: "",
        });
        const node = createNode(element);
        if (!node) {
          return;
        }

        node.draggable(false);
        node.listening(false);
        previewNode = node;
        previewOrigin = { x: pointer.x, y: pointer.y };
        previewToolId = editor.activeToolId;
        render.dynamicLayer.add(node);
        editor.setPreviewNode(node);
        render.dynamicLayer.batchDraw();
      });

      ctx.hooks.pointerMove.tap((event) => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!previewNode || !previewOrigin || !previewToolId) {
          return;
        }

        const pointer = render.dynamicLayer.getRelativePointerPosition();
        if (!pointer) {
          return;
        }

        const currentElement = toElement(previewNode);
        const bounds = fnGetShape2dDraftBounds({
          origin: previewOrigin,
          point: pointer,
          preserveRatio: event.evt.shiftKey,
        });
        const timestamp = now();
        const nextElement = fnCreateShape2dElement({
          id: previewNode.id(),
          type: fnGetShape2dElementTypeFromTool(previewToolId),
          x: bounds.x,
          y: bounds.y,
          rotation: 0,
          width: bounds.width,
          height: bounds.height,
          createdAt: currentElement?.createdAt ?? Number(previewNode.getAttr("vcElementCreatedAt") ?? timestamp),
          updatedAt: timestamp,
          parentGroupId: null,
          zIndex: "",
          style: currentElement?.style,
        });

        txUpdateShape2dNodeFromElement({
          render,
          theme,
          setNodeZIndex,
        }, {
          node: previewNode,
          element: nextElement,
        });
        previewNode.draggable(false);
        previewNode.listening(false);
        render.dynamicLayer.batchDraw();
      });

      ctx.hooks.pointerUp.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!previewNode || !previewToolId) {
          return;
        }

        commitPreview();
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (!isShape2dTextHostNode(render, event.currentTarget)) {
          return false;
        }

        return fxOpenAttachedTextEditMode({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, event.currentTarget);
      });

      ctx.hooks.pointerCancel.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (!previewNode) {
          return;
        }

        cancelCreate();
      });

      ctx.hooks.keydown.tap((event) => {
        if (event.key === "Escape") {
          if (selection.mode !== CanvasMode.DRAW_CREATE) {
            return;
          }

          if (!previewNode) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          cancelCreate();
          return;
        }

        if (event.key !== "Enter") {
          return;
        }

        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          return;
        }

        if (target instanceof HTMLElement && target.isContentEditable) {
          return;
        }

        const shapeNode = getFocusedShape2dTextHost(render, editor, selection);
        if (!shapeNode) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        fxOpenAttachedTextEditMode({
          crdt,
          document: render.container.ownerDocument,
          editor,
          history,
          render,
          renderOrder,
          selection,
          theme,
          createId,
          now,
        }, shapeNode);
      });

      theme.hooks.change.tap(() => {
        render.staticForegroundLayer.find((candidate: Konva.Node) => {
          return candidate instanceof render.Shape && fxGetShape2dNodeType({ render, node: candidate }) !== null;
        }).forEach((candidate) => {
          if (!(candidate instanceof render.Shape)) {
            return;
          }

          const element = editor.toElement(candidate);
          if (!element || !fnIsShape2dElementType(element.data.type)) {
            return;
          }

          txUpdateShape2dNodeFromElement({
            render,
            theme,
            setNodeZIndex,
          }, {
            node: candidate,
            element,
          });
        });
        render.staticForegroundLayer.batchDraw();
      });

      ctx.hooks.destroy.tap(() => {
        destroyPreview();
        contextMenu.unregisterProvider("shape2d");
        renderOrder.unregisterBundleResolver("shape2d");
        editor.unregisterTool("rectangle");
        editor.unregisterTool("diamond");
        editor.unregisterTool("ellipse");
        editor.unregisterToElement("shape2d");
        editor.unregisterCreateShapeFromTElement("shape2d");
        editor.unregisterSetupExistingShape("shape2d");
        editor.unregisterUpdateShapeFromTElement("shape2d");
      });
    },
  };
}
