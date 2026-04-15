import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import Pencil from "lucide-static/icons/pencil.svg?raw";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { PEN_STROKE_WIDTHS } from "../../components/SelectionStyleMenu/types";
import { getStroke } from "perfect-freehand";
import { throttle } from "@solid-primitives/scheduled";
import type { IHooks } from "../../runtime";
import type { CanvasRegistryService } from "../../services";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxGetWorldPositionFromNode } from "../../core/fx.node-space";
import { fxPenPathToElement } from "./fx.path";
import { fxCreatePenDataFromStrokePoints } from "./fn.math";
import { EditorServiceV2, type TEditorToolCanvasPoint } from "src/services/editor/EditorServiceV2";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./CONSTANTS";
import { fxCreatePenNode } from "./fx.create-node";
import { txCreatePenCloneDrag, txCreatePenPreviewClone, txFinalizePenPreviewClone } from "./tx.clone";
import { txSafeStopPenDrag, txSetupPenShapeListeners } from "./tx.listeners";
import { txUpdatePenPathFromElement } from "./tx.path";

const DRAFT_POINTS_ATTR = "vcDraftStrokePoints";
const PEN_TRANSFORM_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function fxCreatePenElementFromDraft(args: {
  id: string;
  now: number;
  points: TEditorToolCanvasPoint[];
}): TElement {
  const penData = fxCreatePenDataFromStrokePoints({ points: args.points });
  if (!penData) {
    throw new Error("Failed to create pen draft data");
  }

  return {
    id: args.id,
    x: penData.x,
    y: penData.y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: args.now,
    updatedAt: args.now,
    data: penData,
    style: {
      backgroundColor: DEFAULT_FILL,
      opacity: DEFAULT_OPACITY,
      strokeWidth: DEFAULT_STROKE_WIDTH,
    },
  };
}

function fxToPenElement(canvasRegistry: CanvasRegistryService, now: () => number, node: Konva.Node) {
  if (!(node instanceof Konva.Path)) {
    return null;
  }

  return fxPenPathToElement({
    editor: { toGroup: (candidate) => canvasRegistry.toGroup(candidate) },
    now,
  }, {
    node,
  });
}

function fxCreatePenRuntimeNode(theme: ThemeService, element: TElement) {
  return fxCreatePenNode({
    Path: Konva.Path,
    theme,
    getStroke,
    resolveThemeColor,
  }, {
    element,
  });
}

function fxStartPenDraftNode(args: {
  theme: ThemeService;
  now: () => number;
  point: TEditorToolCanvasPoint;
}) {
  const node = fxCreatePenRuntimeNode(args.theme, fxCreatePenElementFromDraft({
    id: "pen-draft",
    now: args.now(),
    points: [args.point],
  }));

  if (!node) {
    throw new Error("Failed to create pen node");
  }

  node.setAttr(DRAFT_POINTS_ATTR, [args.point]);
  node.listening(false);
  node.draggable(false);
  return node;
}

function txUpdatePenDraftNode(args: {
  render: SceneService;
  theme: ThemeService;
  previewNode: Konva.Path;
  point: TEditorToolCanvasPoint;
  now: number;
}) {
  const points = [
    ...((args.previewNode.getAttr(DRAFT_POINTS_ATTR) as TEditorToolCanvasPoint[] | undefined) ?? []),
    args.point,
  ];
  args.previewNode.setAttr(DRAFT_POINTS_ATTR, points);

  txUpdatePenPathFromElement({
    Path: Konva.Path,
    render: args.render,
    theme: args.theme,
    getStroke,
    resolveThemeColor,
  }, {
    node: args.previewNode,
    element: fxCreatePenElementFromDraft({
      id: args.previewNode.id(),
      now: args.now,
      points,
    }),
  });
  args.previewNode.listening(false);
  args.previewNode.draggable(false);
}

function txUpdatePenDraft(args: {
  render: SceneService;
  theme: ThemeService;
  previewNode: Konva.Shape;
  point: TEditorToolCanvasPoint;
  now: number;
}) {
  if (!(args.previewNode instanceof Konva.Path)) {
    return;
  }

  txUpdatePenDraftNode({
    render: args.render,
    theme: args.theme,
    previewNode: args.previewNode,
    point: args.point,
    now: args.now,
  });
}

function createCreateId(render: SceneService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `pen-${Date.now()}-${fallbackId}`;
  };
}

function txKeepPenTransformRatio(args: {
  node: Konva.Node;
}) {
  if (!(args.node instanceof Konva.Path)) {
    return false;
  }

  const nextScale = Math.max(
    Math.abs(args.node.scaleX()),
    Math.abs(args.node.scaleY()),
    0.0001,
  );

  args.node.scale({ x: nextScale, y: nextScale });
  return true;
}

function txCommitPenTransform(args: {
  canvasRegistry: CanvasRegistryService;
  render: SceneService;
  theme: ThemeService;
  now: () => number;
  node: Konva.Node;
}) {
  if (!(args.node instanceof Konva.Path)) {
    return false;
  }

  const element = fxToPenElement(args.canvasRegistry, args.now, args.node);
  if (!element) {
    return false;
  }

  txUpdatePenPathFromElement({
    Path: Konva.Path,
    render: args.render,
    theme: args.theme,
    getStroke,
    resolveThemeColor,
  }, {
    node: args.node,
    element,
  });

  return true;
}

/**
 * Owns pen draw-create flow, pen node hydration, drag, and clone wiring.
 * Keeps pen tool state in EditorService and scene behavior in SelectionService.
 */
export function createPenPlugin(): IPlugin<{
  crdt: CrdtService;
  editor2: EditorServiceV2;
  history: HistoryService;
  renderOrder: RenderOrderService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
  canvasRegistry: CanvasRegistryService;
}, IHooks> {
  return {
    name: "pen",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor2");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const now = () => Date.now();
      const createId = createCreateId(render);
      const canvasRegistry = ctx.services.require("canvasRegistry");

      const toElement = (node: Konva.Path) => {
        const element = fxToPenElement(canvasRegistry, now, node);
        if (!element) {
          throw new Error("Failed to serialize pen node");
        }

        return element;
      };

      const setupNode = (node: Konva.Path) => {
        txSetupPenShapeListeners({
          crdt,
          editor,
          updateElement: (element) => canvasRegistry.updateElement(element),
          history,
          render,
          selection,
          hooks: ctx.hooks,
          now,
          Group: Konva.Group,
          Shape: Konva.Shape,
          Path: Konva.Path,
          getWorldPosition: (sourceNode) => fxGetWorldPositionFromNode({}, { node: sourceNode }),
          createThrottledPatch: (callback) => throttle(callback, 100),
          createPenCloneDrag: (sourceNode) => {
            return txCreatePenCloneDrag({
              Path: Konva.Path,
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { node: sourceNode });
          },
          createPenPreviewClone: (sourceNode) => {
            return txCreatePenPreviewClone({
              Path: Konva.Path,
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { node: sourceNode });
          },
          finalizePenPreviewClone: (previewNode) => {
            return txFinalizePenPreviewClone({
              Path: Konva.Path,
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { previewClone: previewNode });
          },
          filterSelection: (nodes) => {
            return fxFilterSelection({ Konva }, {
              editor,
              selection: nodes.filter((node): node is Konva.Group | Konva.Shape => {
                return node instanceof Konva.Group || node instanceof Konva.Shape;
              }),
            });
          },
          safeStopDrag: (sourceNode) => txSafeStopPenDrag({}, { node: sourceNode }),
          toElement,
        }, { node });

        node.setDraggable(true);
        node.listening(true);
        node.visible(true);
        return node;
      };

      canvasRegistry.registerElement({
        id: "pen",
        matchesElement: (element) => element.data.type === "pen",
        matchesNode: (node) => node instanceof Konva.Path,
        toElement: (node) => fxToPenElement(canvasRegistry, now, node),
        createNode: (element) => fxCreatePenRuntimeNode(theme, element),
        attachListeners: (node) => {
          if (!(node instanceof Konva.Path)) {
            return false;
          }

          setupNode(node);
          return true;
        },
        getSelectionStyleMenu: () => ({
          sections: {
            showStrokeColorPicker: true,
            showStrokeWidthPicker: true,
            showOpacityPicker: true,
          },
          values: {
            strokeColor: DEFAULT_FILL,
            strokeWidth: DEFAULT_STROKE_WIDTH,
            opacity: DEFAULT_OPACITY,
          },
          strokeWidthOptions: [...PEN_STROKE_WIDTHS],
        }),
        getTransformOptions: () => ({
          enabledAnchors: [...PEN_TRANSFORM_ANCHORS],
          keepRatio: true,
          flipEnabled: false,
        }),
        onTransform: ({ node }) => {
          txKeepPenTransformRatio({ node });
          return {
            cancel: false,
            crdt: false,
          };
        },
        afterTransform: ({ node }) => ({
          cancel: false,
          crdt: txCommitPenTransform({
            canvasRegistry,
            render,
            theme,
            now,
            node,
          }),
        }),
      });

      ctx.hooks.init.tap(() => {
        editor.registerTool(ctx, {
          id: "pen",
          label: "Pen",
          icon: Pencil,
          behavior: { type: "mode", mode: "draw-create" },
          shortcuts: ["p"],
          drawCreate: {
            startDraft: (args) => fxStartPenDraftNode({ theme, now, point: args.point }),
            updateDraft: (previewNode, args) => txUpdatePenDraft({
              render,
              theme,
              previewNode,
              point: args.point,
              now: args.now,
            }),
          },
        });
      });

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("pen")
      });

    },
  };
}
