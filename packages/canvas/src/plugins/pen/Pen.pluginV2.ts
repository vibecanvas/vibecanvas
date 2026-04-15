import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import Pencil from "lucide-static/icons/pencil.svg?raw";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { PEN_STROKE_WIDTHS } from "../../components/SelectionStyleMenu/types";
import { getStroke } from "perfect-freehand";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import type { CanvasRegistryService } from "../../services";
import type { SceneService } from "../../services/scene/SceneService";
import { fxPenPathToElement } from "./fx.path";
import { fxCreatePenDataFromStrokePoints } from "./fn.math";
import { EditorServiceV2, type TEditorToolCanvasPoint } from "src/services/editor/EditorServiceV2";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./CONSTANTS";
import { fxCreatePenNode } from "./fx.create-node";
import { txUpdatePenPathFromElement } from "./tx.path";

const DRAFT_POINTS_ATTR = "vcDraftStrokePoints";
const PEN_NODE_SETUP_ATTR = "vcPenNodeSetup";
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

function txSetupPenNode(args: {
  hooks: IHooks;
  node: Konva.Node;
}) {
  if (!(args.node instanceof Konva.Path)) {
    return false;
  }

  if (args.node.getAttr(PEN_NODE_SETUP_ATTR) === true) {
    args.node.off("pointerdown pointerdblclick");
  }

  args.node.setAttr(PEN_NODE_SETUP_ATTR, true);

  args.node.on("pointerdown", (event) => {
    const didHandle = args.hooks.elementPointerDown.call(event as TElementPointerEvent);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  args.node.on("pointerdblclick", (event) => {
    const didHandle = args.hooks.elementPointerDoubleClick.call(event as TElementPointerEvent);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  return true;
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
  editor2: EditorServiceV2;
  scene: SceneService;
  theme: ThemeService;
  canvasRegistry: CanvasRegistryService;
}, IHooks> {
  return {
    name: "pen",
    apply(ctx) {
      const editor = ctx.services.require("editor2");
      const render = ctx.services.require("scene");
      const theme = ctx.services.require("theme");
      const now = () => Date.now();
      const canvasRegistry = ctx.services.require("canvasRegistry");

      canvasRegistry.registerElement({
        id: "pen",
        matchesElement: (element) => element.data.type === "pen",
        matchesNode: (node) => node instanceof Konva.Path,
        toElement: (node) => fxToPenElement(canvasRegistry, now, node),
        createNode: (element) => fxCreatePenRuntimeNode(theme, element),
        attachListeners: (node) => txSetupPenNode({ hooks: ctx.hooks, node }),
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
