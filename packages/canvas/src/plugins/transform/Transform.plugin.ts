import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { throttle } from "@solid-primitives/scheduled";
import type { CanvasRegistryService, TCanvasTransformAnchor } from "../../services";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorServiceV2 } from "../../services/editor/EditorServiceV2";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxIsShape1dNode } from "../shape1d/fx.node";

const GROUP_ANCHORS: TCanvasTransformAnchor[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const DEFAULT_ANCHORS: TCanvasTransformAnchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "middle-left",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const TRANSFORM_DRAG_PROXY_NAME = "transform-drag-proxy";
const INTERACTION_OVERLAY_ATTR = "vcInteractionOverlay";
const TRANSFORM_MOVE_BEFORE_ELEMENT_ATTR = "vcTransformMoveBeforeElement";
const TRANSFORM_BEFORE_ELEMENT_ATTR = "vcTransformBeforeElement";
const MOVE_PATCH_INTERVAL_MS = 1000 / 30;

type TTransformDragProxyState = {
  node: Shape<ShapeConfig>;
  beforeElement: TElement;
  label: string;
  proxyStartPosition: { x: number; y: number };
  nodeStartPosition: { x: number; y: number };
  throttledPatch: (element: TElement) => void;
};

/**
 * Expands a runtime selection into nodes that can round-trip through the canvas registry.
 * Element-groups are treated as serializable roots, while structural groups recurse into children.
 */
function collectSerializableNodes(
  canvasRegistry: CanvasRegistryService,
  render: SceneService,
  nodes: Konva.Node[],
): Array<Group | Shape<ShapeConfig>> {
  return nodes.flatMap((node) => {
    if (node instanceof Konva.Group) {
      return canvasRegistry.toElement(node) ? [node] : collectSerializableNodes(canvasRegistry, render, node.getChildren());
    }

    if (node instanceof Konva.Shape) {
      return [node];
    }

    return [];
  });
}

/**
 * Serializes the current runtime nodes into persisted canvas elements.
 * Used for transform snapshots and history capture.
 */
function serializeSelection(canvasRegistry: CanvasRegistryService, render: SceneService, nodes: Konva.Node[]) {
  const serializableNodes = collectSerializableNodes(canvasRegistry, render, nodes);
  return serializableNodes
    .map((node) => canvasRegistry.toElement(node))
    .filter((element): element is TElement => element !== null);
}

/**
 * Replays persisted elements back onto the existing runtime scene.
 */
function applyElements(canvasRegistry: CanvasRegistryService, elements: TElement[]) {
  elements.forEach((element) => {
    canvasRegistry.updateElement(element);
  });
}

/**
 * Clears transient Konva transform state on structural groups after a transform commit.
 * Persisted children carry the real geometry, so group container transforms must be reset.
 */
function normalizeSelectedGroupTransforms(render: SceneService, nodes: Konva.Node[]) {
  void render;
  nodes.forEach((node) => {
    if (!(node instanceof Konva.Group)) {
      return;
    }

    node.scale({ x: 1, y: 1 });
    node.rotation(0);
    node.skew({ x: 0, y: 0 });
  });
}

/**
 * Re-emits transform on selected structural groups so plugins can refresh derived visuals.
 */
function refreshSelectedGroups(canvasRegistry: CanvasRegistryService, selection: SelectionService) {
  selection.selection.forEach((node) => {
    if (fxIsCanvasGroupNode({}, { editor: canvasRegistry, node })) {
      node.fire("transform");
    }
  });
}

/**
 * Resolves transformer UI options for the active selection.
 * Defaults handle common multi-select and text/1d/group cases, then registry overrides apply.
 */
function getSelectionTransformOptions(args: {
  Konva: typeof Konva;
  canvasRegistry: CanvasRegistryService;
  selection: Array<Group | Shape<ShapeConfig>>;
}) {
  const isSingleGroupSelection = args.selection.length === 1
    && fxIsCanvasGroupNode({}, { editor: args.canvasRegistry, node: args.selection[0] });
  const isMultiSelection = args.selection.length > 1;
  const hasTextOnly = args.selection.length > 0 && args.selection.every((node) => node instanceof args.Konva.Text);
  const hasShape1dOnly = args.selection.length > 0 && args.selection.every((node) => fxIsShape1dNode({ Shape: args.Konva.Shape }, { node }));

  const defaultUseCornerAnchors = isSingleGroupSelection || hasTextOnly || hasShape1dOnly || isMultiSelection;
  let enabledAnchors: TCanvasTransformAnchor[] = defaultUseCornerAnchors ? [...GROUP_ANCHORS] : [...DEFAULT_ANCHORS];
  let keepRatio = defaultUseCornerAnchors;
  let flipEnabled = true;

  for (const node of args.selection) {
    const transformOptions = args.canvasRegistry.getTransformOptions({
      node,
      selection: args.selection,
    });

    if (args.selection.length === 1 && transformOptions.enabledAnchors) {
      enabledAnchors = [...transformOptions.enabledAnchors];
    }
    if (transformOptions.keepRatio === true) {
      keepRatio = true;
    }
    if (args.selection.length === 1 && transformOptions.keepRatio === false) {
      keepRatio = false;
    }
    if (transformOptions.flipEnabled === false) {
      flipEnabled = false;
    }
    if (args.selection.length === 1 && transformOptions.flipEnabled === true) {
      flipEnabled = true;
    }
  }

  return {
    borderEnabled: !isSingleGroupSelection,
    borderDash: isMultiSelection ? [2, 2] : [0, 0],
    enabledAnchors,
    keepRatio,
    flipEnabled,
  };
}

/**
 * Returns transformer-local pointer position from the dynamic layer.
 */
function getTransformerPointer(scene: SceneService) {
  return scene.dynamicLayer.getRelativePointerPosition();
}

/**
 * Narrows Konva transformer anchor names into the typed registry anchor union.
 */
function isTypedAnchor(anchor: string | null): anchor is TCanvasTransformAnchor {
  return anchor === "top-left"
    || anchor === "top-center"
    || anchor === "top-right"
    || anchor === "middle-left"
    || anchor === "middle-right"
    || anchor === "bottom-left"
    || anchor === "bottom-center"
    || anchor === "bottom-right";
}

/**
 * Dispatches live resize callbacks to registry element definitions for the current selection.
 */
function fnMergeTransformHookResult(
  current: { cancel: boolean; crdt: boolean },
  next: { cancel: boolean; crdt: boolean } | void,
) {
  if (!next) {
    return current;
  }

  return {
    cancel: current.cancel || next.cancel,
    crdt: current.crdt || next.crdt,
  };
}

/**
 * Dispatches transform callbacks for one selection across all matching registry definitions.
 * Defaults remain owned by this plugin; registry callbacks are only optional overrides.
 */
function txDispatchSelectionTransformHooks<TArgs extends { node: Konva.Node; element: TElement; selection: Array<Group | Shape<ShapeConfig>> }>(args: {
  canvasRegistry: CanvasRegistryService;
  selection: Array<Group | Shape<ShapeConfig>>;
  createArgs: (node: Group | Shape<ShapeConfig>, element: TElement) => TArgs;
  getHook: (definition: ReturnType<CanvasRegistryService["getMatchingElementDefinitionsByNode"]>[number]) => ((args: TArgs) => { cancel: boolean; crdt: boolean } | void) | undefined;
}) {
  let result = { cancel: false, crdt: false };
  const handledNodeIds = new Set<string>();

  for (const node of args.selection) {
    const element = args.canvasRegistry.toElement(node);
    if (!element) {
      continue;
    }

    const hookArgs = args.createArgs(node, element);
    const definitions = args.canvasRegistry.getMatchingElementDefinitionsByNode(node);
    let handledNode = false;
    for (const definition of definitions) {
      const hookResult = args.getHook(definition)?.(hookArgs);
      result = fnMergeTransformHookResult(result, hookResult);
      handledNode = handledNode || Boolean(hookResult?.cancel);
    }

    if (handledNode) {
      handledNodeIds.add(node.id());
    }
  }

  return {
    ...result,
    handledNodeIds,
  };
}

/**
 * Dispatches resize-finalization callbacks after the interactive transformer gesture ends.
 */
function txApplySelectionResizeHooks(args: {
  canvasRegistry: CanvasRegistryService;
  scene: SceneService;
  selection: Array<Group | Shape<ShapeConfig>>;
  anchors: TCanvasTransformAnchor[];
}) {
  const pointer = getTransformerPointer(args.scene);

  return txDispatchSelectionTransformHooks({
    canvasRegistry: args.canvasRegistry,
    selection: args.selection,
    createArgs: (node, element) => ({
      node,
      element,
      pointer,
      anchors: args.anchors,
      selection: args.selection,
    }),
    getHook: (definition) => definition.onResize,
  });
}

function txApplySelectionRotateHooks(args: {
  canvasRegistry: CanvasRegistryService;
  selection: Array<Group | Shape<ShapeConfig>>;
}) {
  return txDispatchSelectionTransformHooks({
    canvasRegistry: args.canvasRegistry,
    selection: args.selection,
    createArgs: (node, element) => ({
      node,
      element,
      rotation: node.rotation(),
      selection: args.selection,
    }),
    getHook: (definition) => definition.onRotate,
  });
}

/**
 * Dispatches resize-finalization callbacks after the interactive transformer gesture ends.
 */
function txFinalizeSelectionResize(args: {
  canvasRegistry: CanvasRegistryService;
  scene: SceneService;
  selection: Array<Group | Shape<ShapeConfig>>;
  anchors: TCanvasTransformAnchor[];
}) {
  const pointer = getTransformerPointer(args.scene);

  return txDispatchSelectionTransformHooks({
    canvasRegistry: args.canvasRegistry,
    selection: args.selection,
    createArgs: (node, element) => ({
      node,
      element,
      pointer,
      anchors: args.anchors,
      selection: args.selection,
    }),
    getHook: (definition) => definition.afterResize,
  });
}

function txFinalizeSelectionRotate(args: {
  canvasRegistry: CanvasRegistryService;
  selection: Array<Group | Shape<ShapeConfig>>;
}) {
  return txDispatchSelectionTransformHooks({
    canvasRegistry: args.canvasRegistry,
    selection: args.selection,
    createArgs: (node, element) => ({
      node,
      element,
      rotation: node.rotation(),
      selection: args.selection,
    }),
    getHook: (definition) => definition.afterRotate,
  });
}

/**
 * Returns true when the selected node should be moved through the invisible drag proxy.
 * Today this is used for pen and shape1d nodes that benefit from a larger drag hit target.
 */
function isProxyDragCandidate(args: {
  Konva: typeof Konva;
  scene: SceneService;
  canvasRegistry: CanvasRegistryService;
  node: Group | Shape<ShapeConfig>;
}) {
  void args.scene;
  if (!(args.node instanceof args.Konva.Shape)) {
    return false;
  }

  if (fxIsShape1dNode({ Shape: args.Konva.Shape }, { node: args.node })) {
    return true;
  }

  const pathNode = args.node as unknown as Konva.Node;
  if (!(pathNode instanceof args.Konva.Path)) {
    return false;
  }

  const element = args.canvasRegistry.toElement(pathNode);
  return element?.data.type === "pen";
}

/**
 * Resolves the one selected node eligible for drag-proxy movement.
 * Proxy drag is only enabled for a single filtered selection in select mode.
 */
function getProxyDragTarget(args: {
  scene: SceneService;
  canvasRegistry: CanvasRegistryService;
  selection: SelectionService;
}) {
  if (args.selection.mode !== "select") {
    return null;
  }

  const rawSelection = args.selection.selection;
  const filteredSelection = fxFilterSelection({
    Konva,
  }, {
    editor: args.canvasRegistry,
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
    Konva,
    scene: args.scene,
    canvasRegistry: args.canvasRegistry,
    node: rawNode,
  })
    ? rawNode as Shape<ShapeConfig>
    : null;
}

/**
 * Produces the history label for drag-proxy move operations.
 */
function getProxyDragLabel(element: TElement) {
  return element.data.type === "pen" ? "drag-pen" : "drag-shape1d";
}

/**
 * Computes proxy rectangle bounds in layer space from the target node's world transform.
 */
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

/**
 * Applies current theme colors to the shared Konva transformer instance.
 */
function syncTransformerTheme(theme: ThemeService, transformer: Konva.Transformer) {
  const activeTheme = theme.getTheme();
  transformer.borderStroke(activeTheme.colors.canvasSelectionStroke);
  transformer.anchorStroke(activeTheme.colors.canvasSelectionStroke);
  transformer.anchorFill(activeTheme.colors.background);
  transformer.anchorCornerRadius(0);
  transformer.anchorSize(8);
}

/**
 * Syncs transformer nodes and UI options from current editor/selection state.
 */
function syncTransformer(args: {
  Konva: typeof Konva;
  scene: SceneService;
  canvasRegistry: CanvasRegistryService;
  editor: EditorServiceV2;
  selection: SelectionService;
  transformer: Konva.Transformer;
}) {
  if (args.editor.editingTextId !== null || args.editor.editingShape1dId !== null) {
    args.transformer.setNodes([]);
    args.transformer.update();
    args.scene.dynamicLayer.batchDraw();
    return;
  }

  const filteredSelection = fxFilterSelection({ Konva }, { editor: args.canvasRegistry, selection: args.selection.selection });
  const transformOptions = getSelectionTransformOptions({
    Konva,
    canvasRegistry: args.canvasRegistry,
    selection: filteredSelection,
  });

  args.transformer.borderEnabled(transformOptions.borderEnabled);
  args.transformer.borderDash(transformOptions.borderDash);
  args.transformer.keepRatio(transformOptions.keepRatio);
  args.transformer.flipEnabled(transformOptions.flipEnabled);
  args.transformer.enabledAnchors(transformOptions.enabledAnchors);
  args.transformer.setNodes(filteredSelection);
  args.transformer.update();
  args.scene.dynamicLayer.batchDraw();
}

/**
 * Owns shared transform UX for existing scene nodes.
 *
 * Responsibilities:
 * - keep one shared Konva.Transformer in sync with filtered selection
 * - provide a drag proxy for single pen/shape1d selections
 * - route semantic move/resize callbacks through CanvasRegistryService
 * - keep generic transform persistence as fallback when plugins do not own it
 *
 * Design notes:
 * - move persistence belongs to element plugins when they opt into callbacks
 * - resize/rotate fallback still lives here for element types that have not claimed ownership yet
 * - drag proxy stays behind the visual node so direct pointer targeting still works
 */
export function createTransformPlugin(): IPlugin<{
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  editor2: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
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
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor2");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");

      const refreshTransformer = () => {
        if (!transformer) {
          return;
        }

        syncTransformer({
          Konva,
          scene: render,
          canvasRegistry,
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

        const target = getProxyDragTarget({ scene: render, canvasRegistry, selection });
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
        applyElements(canvasRegistry, [element]);
        refreshTransformer();
        render.staticForegroundLayer.batchDraw();
      };

      ctx.hooks.init.tap(() => {
        dragProxy = new Konva.Rect({
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

          const target = getProxyDragTarget({ scene: render, canvasRegistry, selection });

          if (event.evt?.altKey) {
            dragProxy.stopDrag();
            dragProxy.absolutePosition(dragProxy.absolutePosition());
            if (target) {
              canvasRegistry.createDragClone({
                node: target,
                selection: selection.selection,
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

          const beforeElement = canvasRegistry.toElement(target);
          if (!beforeElement) {
            dragProxy.stopDrag();
            refreshDragProxy();
            return;
          }

          target.setAttr(TRANSFORM_MOVE_BEFORE_ELEMENT_ATTR, structuredClone(beforeElement));
          dragProxyState = {
            node: target,
            beforeElement,
            label: getProxyDragLabel(beforeElement),
            proxyStartPosition: { ...dragProxy.absolutePosition() },
            nodeStartPosition: { ...target.absolutePosition() },
            throttledPatch: throttle((element: TElement) => {
              crdt.patch({ elements: [element], groups: [] });
            }, MOVE_PATCH_INTERVAL_MS),
          };
        });

        dragProxy.on("dragmove", () => {
          if (!dragProxy || !dragProxyState) {
            return;
          }

          const state = dragProxyState;
          const currentProxyPosition = dragProxy.absolutePosition();
          const dx = currentProxyPosition.x - state.proxyStartPosition.x;
          const dy = currentProxyPosition.y - state.proxyStartPosition.y;
          state.node.absolutePosition({
            x: state.nodeStartPosition.x + dx,
            y: state.nodeStartPosition.y + dy,
          });

          const element = canvasRegistry.toElement(state.node);
          if (element) {
            const moveResult = txDispatchSelectionTransformHooks({
              canvasRegistry,
              selection: selection.selection,
              createArgs: () => ({
                node: state.node,
                element,
                pointer: render.dynamicLayer.getRelativePointerPosition(),
                selection: selection.selection,
              }),
              getHook: (definition) => definition.onMove,
            });

            if (!moveResult.cancel) {
              const nextElement = canvasRegistry.toElement(state.node);
              if (nextElement) {
                state.throttledPatch(nextElement);
              }
            }
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
          const afterElement = canvasRegistry.toElement(state.node);
          state.node.setAttr(TRANSFORM_MOVE_BEFORE_ELEMENT_ATTR, undefined);
          if (!afterElement) {
            refreshDragProxy();
            return;
          }

          const afterMoveResult = txDispatchSelectionTransformHooks({
            canvasRegistry,
            selection: selection.selection,
            createArgs: () => ({
              node: state.node,
              element: afterElement,
              pointer: render.dynamicLayer.getRelativePointerPosition(),
              selection: selection.selection,
            }),
            getHook: (definition) => definition.afterMove,
          });
          refreshDragProxy();

          if (afterMoveResult.cancel) {
            return;
          }

          crdt.patch({ elements: [afterElement], groups: [] });

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

        transformer = new Konva.Transformer();
        syncTransformerTheme(theme, transformer);
        render.dynamicLayer.add(transformer);
        editor.setTransformer(transformer);

        transformer.on("transformstart", () => {
          const nodes = transformer?.getNodes() ?? [];
          beforeElements = serializeSelection(canvasRegistry, render, nodes);
          nodes.forEach((node) => {
            const beforeElement = canvasRegistry.toElement(node);
            if (!beforeElement) {
              return;
            }

            node.setAttr(TRANSFORM_BEFORE_ELEMENT_ATTR, structuredClone(beforeElement));
          });
        });

        transformer.on("transform", () => {
          if (!transformer) {
            return;
          }

          const activeAnchor = transformer.getActiveAnchor();
          const anchors = isTypedAnchor(activeAnchor) ? [activeAnchor] : [];
          const selectedNodes = transformer.getNodes() as Array<Group | Shape<ShapeConfig>>;
          if (activeAnchor === "rotater") {
            txApplySelectionRotateHooks({
              canvasRegistry,
              selection: selectedNodes,
            });
          } else {
            txApplySelectionResizeHooks({
              canvasRegistry,
              scene: render,
              selection: selectedNodes,
              anchors,
            });
          }
          transformer.forceUpdate();
          render.dynamicLayer.batchDraw();
          refreshDragProxy();
        });

        transformer.on("transformend", () => {
          if (!transformer) {
            return;
          }

          const nodes = transformer.getNodes();
          const activeAnchor = transformer.getActiveAnchor();
          const anchors = isTypedAnchor(activeAnchor) ? [activeAnchor] : [];
          const transformResult = activeAnchor === "rotater"
            ? txFinalizeSelectionRotate({
              canvasRegistry,
              selection: nodes as Array<Group | Shape<ShapeConfig>>,
            })
            : txFinalizeSelectionResize({
              canvasRegistry,
              scene: render,
              selection: nodes as Array<Group | Shape<ShapeConfig>>,
              anchors,
            });

          const afterElements = serializeSelection(canvasRegistry, render, nodes);
          if (afterElements.length === 0) {
            return;
          }

          nodes.forEach((node) => {
            node.setAttr(TRANSFORM_BEFORE_ELEMENT_ATTR, undefined);
          });

          const fallbackBeforeElements = beforeElements.filter((element) => !transformResult.handledNodeIds.has(element.id));
          const fallbackAfterElements = afterElements.filter((element) => !transformResult.handledNodeIds.has(element.id));

          if (fallbackAfterElements.length === 0) {
            refreshSelectedGroups(canvasRegistry, selection);
            refreshTransformer();
            refreshDragProxy();
            return;
          }

          normalizeSelectedGroupTransforms(render, nodes);
          applyElements(canvasRegistry, fallbackAfterElements);
          refreshSelectedGroups(canvasRegistry, selection);
          refreshTransformer();
          refreshDragProxy();
          crdt.patch({ elements: fallbackAfterElements, groups: [] });

          if (fallbackBeforeElements.length === 0) {
            return;
          }

          const undoElements = structuredClone(fallbackBeforeElements);
          const redoElements = structuredClone(fallbackAfterElements);

          history.record({
            label: "transform",
            undo: () => {
              applyElements(canvasRegistry, undoElements);
              refreshSelectedGroups(canvasRegistry, selection);
              refreshTransformer();
              refreshDragProxy();
              crdt.patch({ elements: undoElements, groups: [] });
            },
            redo: () => {
              applyElements(canvasRegistry, redoElements);
              refreshSelectedGroups(canvasRegistry, selection);
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
        canvasRegistry.hooks.elementsChange.tap(() => {
          refreshTransformer();
          refreshDragProxy();
        });
        canvasRegistry.hooks.groupsChange.tap(() => {
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
