import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { throttle } from "@solid-primitives/scheduled";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { fxIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxIsShape1dNode } from "../shape1d/fx.node";

const GROUP_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

const DEFAULT_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "middle-left",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

const TRANSFORM_DRAG_PROXY_NAME = "transform-drag-proxy";
const INTERACTION_OVERLAY_ATTR = "vcInteractionOverlay";

type TTransformDragProxyState = {
  node: Shape<ShapeConfig>;
  beforeElement: TElement;
  label: string;
  proxyStartPosition: { x: number; y: number };
  nodeStartPosition: { x: number; y: number };
  throttledPatch: (element: TElement) => void;
};

function collectSerializableNodes(
  editor: EditorService,
  render: SceneService,
  nodes: Konva.Node[],
): Array<Group | Shape<ShapeConfig>> {
  return nodes.flatMap((node) => {
    if (node instanceof render.Group) {
      return editor.toElement(node) ? [node] : collectSerializableNodes(editor, render, node.getChildren());
    }

    if (node instanceof render.Shape) {
      return [node];
    }

    return [];
  });
}

function serializeSelection(editor: EditorService, render: SceneService, nodes: Konva.Node[]) {
  const serializableNodes = collectSerializableNodes(editor, render, nodes);
  return serializableNodes
    .map((node) => editor.toElement(node))
    .filter((element): element is TElement => element !== null);
}

function applyElements(editor: EditorService, elements: TElement[]) {
  elements.forEach((element) => {
    editor.updateShapeFromTElement(element);
  });
}

function normalizeSelectedGroupTransforms(render: SceneService, nodes: Konva.Node[]) {
  nodes.forEach((node) => {
    if (!(node instanceof render.Group)) {
      return;
    }

    node.scale({ x: 1, y: 1 });
    node.rotation(0);
    node.skew({ x: 0, y: 0 });
  });
}

function refreshSelectedGroups(editor: EditorService, selection: SelectionService) {
  selection.selection.forEach((node) => {
    if (fxIsCanvasGroupNode({ editor, node })) {
      node.fire("transform");
    }
  });
}

function hasPenOnlySelection(args: {
  render: SceneService;
  editor: EditorService;
  selection: Array<Group | Shape<ShapeConfig>>;
}) {
  return args.selection.length > 0 && args.selection.every((node) => {
    if (!(node instanceof args.render.Path)) {
      return false;
    }

    const element = args.editor.toElement(node);
    return element?.data.type === "pen";
  });
}

function isProxyDragCandidate(args: {
  render: SceneService;
  editor: EditorService;
  node: Group | Shape<ShapeConfig>;
}) {
  if (!(args.node instanceof args.render.Shape)) {
    return false;
  }

  if (fxIsShape1dNode({ Shape: args.render.Shape }, { node: args.node })) {
    return true;
  }

  const pathNode = args.node as unknown as Konva.Node;
  if (!(pathNode instanceof args.render.Path)) {
    return false;
  }

  const element = args.editor.toElement(pathNode);
  return element?.data.type === "pen";
}

function getProxyDragTarget(args: {
  render: SceneService;
  editor: EditorService;
  selection: SelectionService;
}) {
  if (args.selection.mode !== "select") {
    return null;
  }

  const rawSelection = args.selection.selection;
  const filteredSelection = fxFilterSelection({
    render: args.render,
    editor: args.editor,
    selection: rawSelection,
  });

  if (rawSelection.length !== 1 || filteredSelection.length !== 1) {
    return null;
  }

  const rawNode = rawSelection[0];
  const filteredNode = filteredSelection[0];
  if (!rawNode || rawNode !== filteredNode) {
    return null;
  }

  return isProxyDragCandidate({
    render: args.render,
    editor: args.editor,
    node: rawNode,
  })
    ? rawNode as Shape<ShapeConfig>
    : null;
}

function getProxyDragLabel(element: TElement) {
  return element.data.type === "pen" ? "drag-pen" : "drag-shape1d";
}

function getProxyBounds(render: SceneService, node: Shape<ShapeConfig>) {
  const localRect = node.getClientRect({ relativeTo: node });
  const nodeTransform = node.getAbsoluteTransform();
  const layerInverseTransform = render.staticForegroundLayer.getAbsoluteTransform().copy();
  layerInverseTransform.invert();

  const topLeft = layerInverseTransform.point(nodeTransform.point({ x: localRect.x, y: localRect.y }));
  const topRight = layerInverseTransform.point(nodeTransform.point({ x: localRect.x + localRect.width, y: localRect.y }));
  const bottomLeft = layerInverseTransform.point(nodeTransform.point({ x: localRect.x, y: localRect.y + localRect.height }));

  return {
    position: topLeft,
    width: Math.max(1, Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y)),
    height: Math.max(1, Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y)),
    rotation: Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI,
  };
}

function syncTransformerTheme(theme: ThemeService, transformer: Konva.Transformer) {
  const activeTheme = theme.getTheme();
  transformer.borderStroke(activeTheme.colors.canvasSelectionStroke);
  transformer.anchorStroke(activeTheme.colors.canvasSelectionStroke);
  transformer.anchorFill(activeTheme.colors.background);
  transformer.anchorCornerRadius(0);
  transformer.anchorSize(8);
}

function syncTransformer(args: {
  render: SceneService;
  editor: EditorService;
  selection: SelectionService;
  transformer: Konva.Transformer;
}) {
  if (args.editor.editingTextId !== null || args.editor.editingShape1dId !== null) {
    args.transformer.setNodes([]);
    args.transformer.update();
    args.render.dynamicLayer.batchDraw();
    return;
  }

  const filteredSelection = fxFilterSelection({ render: args.render, editor: args.editor, selection: args.selection.selection });
  const isSingleGroupSelection = filteredSelection.length === 1 && fxIsCanvasGroupNode({ editor: args.editor, node: filteredSelection[0] });
  const isMultiSelection = filteredSelection.length > 1;
  const hasTextOnly = filteredSelection.length > 0 && filteredSelection.every((node) => node instanceof args.render.Text);
  const hasShape1dOnly = filteredSelection.length > 0 && filteredSelection.every((node) => fxIsShape1dNode({ Shape: args.render.Shape }, { node }));
  const hasPenOnly = hasPenOnlySelection({
    render: args.render,
    editor: args.editor,
    selection: filteredSelection,
  });
  const useCornerAnchors = isSingleGroupSelection || hasTextOnly || hasShape1dOnly || hasPenOnly || isMultiSelection;

  args.transformer.borderEnabled(!isSingleGroupSelection);
  args.transformer.borderDash(isMultiSelection ? [2, 2] : [0, 0]);
  args.transformer.keepRatio(useCornerAnchors);
  args.transformer.enabledAnchors(useCornerAnchors ? [...GROUP_ANCHORS] : [...DEFAULT_ANCHORS]);
  args.transformer.setNodes(filteredSelection);
  args.transformer.update();
  args.render.dynamicLayer.batchDraw();
}

/**
 * Owns shared transformer UI for current selection.
 * Also adds a drag proxy for single pen/shape1d selections.
 * Proxy sits behind selected node, so direct stroke clicks still work.
 */
export function createTransformPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  let transformer: Konva.Transformer | null = null;
  let dragProxy: Konva.Rect | null = null;
  let dragProxyState: TTransformDragProxyState | null = null;
  let beforeElements: TElement[] = [];

  return {
    name: "transform",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");

      const refreshTransformer = () => {
        if (!transformer) {
          return;
        }

        syncTransformer({
          render,
          editor,
          selection,
          transformer,
        });
      };

      const hideDragProxy = () => {
        if (!dragProxy) {
          return;
        }

        dragProxy.visible(false);
        dragProxy.listening(false);
        dragProxy.draggable(false);
        render.staticForegroundLayer.batchDraw();
      };

      const refreshDragProxy = () => {
        if (!dragProxy || dragProxyState) {
          return;
        }

        if (editor.editingTextId !== null || editor.editingShape1dId !== null) {
          hideDragProxy();
          return;
        }

        const target = getProxyDragTarget({ render, editor, selection });
        if (!target) {
          hideDragProxy();
          return;
        }

        const bounds = getProxyBounds(render, target);
        dragProxy.position(bounds.position);
        dragProxy.rotation(bounds.rotation);
        dragProxy.scale({ x: 1, y: 1 });
        dragProxy.size({ width: bounds.width, height: bounds.height });
        dragProxy.visible(true);
        dragProxy.listening(true);
        dragProxy.draggable(true);
        const targetIndex = target.zIndex();
        const proxyIndex = dragProxy.zIndex();
        dragProxy.zIndex(proxyIndex < targetIndex ? Math.max(0, targetIndex - 1) : targetIndex);
        render.staticForegroundLayer.batchDraw();
      };

      const applyProxyDragElement = (element: TElement) => {
        applyElements(editor, [element]);
        refreshTransformer();
        render.staticForegroundLayer.batchDraw();
      };

      ctx.hooks.init.tap(() => {
        dragProxy = new render.Rect({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          fill: theme.getTheme().colors.canvasSelectionFill,
          opacity: 0.01,
          strokeEnabled: false,
          visible: false,
          listening: false,
          draggable: false,
          name: TRANSFORM_DRAG_PROXY_NAME,
        });
        dragProxy.setAttr(INTERACTION_OVERLAY_ATTR, true);
        render.staticForegroundLayer.add(dragProxy);

        dragProxy.on("dragstart", (event) => {
          if (!dragProxy) {
            return;
          }

          const target = getProxyDragTarget({ render, editor, selection });

          if (event.evt?.altKey) {
            dragProxy.stopDrag();
            dragProxy.absolutePosition(dragProxy.absolutePosition());
            if (target) {
              target.fire("dragstart", {
                target,
                currentTarget: target,
                evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
              });
            }
            refreshDragProxy();
            return;
          }

          if (!target) {
            dragProxy.stopDrag();
            hideDragProxy();
            return;
          }

          const beforeElement = editor.toElement(target);
          if (!beforeElement) {
            dragProxy.stopDrag();
            refreshDragProxy();
            return;
          }

          dragProxyState = {
            node: target,
            beforeElement,
            label: getProxyDragLabel(beforeElement),
            proxyStartPosition: { ...dragProxy.absolutePosition() },
            nodeStartPosition: { ...target.absolutePosition() },
            throttledPatch: throttle((element: TElement) => {
              crdt.patch({ elements: [element], groups: [] });
            }, 100),
          };
        });

        dragProxy.on("dragmove", () => {
          if (!dragProxy || !dragProxyState) {
            return;
          }

          const currentProxyPosition = dragProxy.absolutePosition();
          const dx = currentProxyPosition.x - dragProxyState.proxyStartPosition.x;
          const dy = currentProxyPosition.y - dragProxyState.proxyStartPosition.y;
          dragProxyState.node.absolutePosition({
            x: dragProxyState.nodeStartPosition.x + dx,
            y: dragProxyState.nodeStartPosition.y + dy,
          });

          const element = editor.toElement(dragProxyState.node);
          if (element) {
            dragProxyState.throttledPatch(element);
          }
          render.staticForegroundLayer.batchDraw();
        });

        dragProxy.on("dragend", () => {
          if (!dragProxy || !dragProxyState) {
            refreshDragProxy();
            return;
          }

          const state = dragProxyState;
          dragProxyState = null;
          const afterElement = editor.toElement(state.node);
          if (!afterElement) {
            refreshDragProxy();
            return;
          }

          crdt.patch({ elements: [afterElement], groups: [] });
          refreshDragProxy();

          const didMove = state.beforeElement.x !== afterElement.x || state.beforeElement.y !== afterElement.y;
          if (!didMove) {
            return;
          }

          const undoElement = structuredClone(state.beforeElement);
          const redoElement = structuredClone(afterElement);
          history.record({
            label: state.label,
            undo: () => {
              applyProxyDragElement(undoElement);
              crdt.patch({ elements: [undoElement], groups: [] });
              refreshDragProxy();
            },
            redo: () => {
              applyProxyDragElement(redoElement);
              crdt.patch({ elements: [redoElement], groups: [] });
              refreshDragProxy();
            },
          });
        });

        transformer = new render.Transformer();
        syncTransformerTheme(theme, transformer);
        render.dynamicLayer.add(transformer);
        editor.setTransformer(transformer);

        transformer.on("transformstart", () => {
          beforeElements = serializeSelection(editor, render, transformer?.getNodes() ?? []);
        });

        transformer.on("transformend", () => {
          if (!transformer) {
            return;
          }

          const afterElements = serializeSelection(editor, render, transformer.getNodes());
          if (afterElements.length === 0) {
            return;
          }

          normalizeSelectedGroupTransforms(render, transformer.getNodes());
          applyElements(editor, afterElements);
          refreshSelectedGroups(editor, selection);
          refreshTransformer();
          refreshDragProxy();
          crdt.patch({ elements: afterElements, groups: [] });

          if (beforeElements.length === 0) {
            return;
          }

          const undoElements = structuredClone(beforeElements);
          const redoElements = structuredClone(afterElements);

          history.record({
            label: "transform",
            undo: () => {
              applyElements(editor, undoElements);
              refreshSelectedGroups(editor, selection);
              refreshTransformer();
              refreshDragProxy();
              crdt.patch({ elements: undoElements, groups: [] });
            },
            redo: () => {
              applyElements(editor, redoElements);
              refreshSelectedGroups(editor, selection);
              refreshTransformer();
              refreshDragProxy();
              crdt.patch({ elements: redoElements, groups: [] });
            },
          });
        });

        refreshTransformer();
        refreshDragProxy();

        selection.hooks.change.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        editor.hooks.editingTextChange.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        editor.hooks.editingShape1dChange.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        editor.hooks.toElementRegistryChange.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        editor.hooks.updateShapeFromTElementRegistryChange.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        theme.hooks.change.tap(() => {
          if (transformer) {
            syncTransformerTheme(theme, transformer);
          }
          if (dragProxy) {
            dragProxy.fill(theme.getTheme().colors.canvasSelectionFill);
          }
          refreshTransformer();
          refreshDragProxy();
        });
      });

      ctx.hooks.pointerMove.tap((event) => {
        if (event.evt.buttons === 0) {
          return;
        }

        refreshDragProxy();
      });

      ctx.hooks.pointerUp.tap(() => {
        refreshDragProxy();
      });

      ctx.hooks.pointerCancel.tap(() => {
        dragProxyState = null;
        refreshDragProxy();
      });

      ctx.hooks.destroy.tap(() => {
        editor.setTransformer(null);
        dragProxyState = null;
        dragProxy?.destroy();
        dragProxy = null;
        transformer?.destroy();
        transformer = null;
      });
    },
  };
}
