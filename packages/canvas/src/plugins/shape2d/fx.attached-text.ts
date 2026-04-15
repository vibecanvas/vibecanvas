import type { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import { fxGetCanvasParentGroupId, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxGetShapeTextHostBounds } from "./fn.text-host-bounds";

const ATTACHED_TEXT_NAME = "attached-text";

export type TPortalAttachedText = {
  Konva: typeof Konva;
  crdt: CrdtService;
  document: Document;
  editor: Pick<EditorService, "createShapeFromTElement" | "editingTextId"> & {
    toGroup(node: Konva.Node): unknown;
    toElement(node: Konva.Node): TElement | null;
  };
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
  createId: () => string;
  now: () => number;
  pretext: {
    layoutWithLines: typeof layoutWithLines;
    prepareWithSegments: typeof prepareWithSegments;
  };
  enterEditMode: (args: { freeTextName: string; node: Konva.Text; isNew: boolean }) => void;
};

export type TArgsGetAttachedTextNode = {
  shapeNode: Konva.Shape;
};

export type TArgsSyncAttachedTextNodeToShape = {
  shapeNode: Konva.Shape;
  textNode: Konva.Text;
};

export type TArgsPersistAttachedTextNode = {
  textNode: Konva.Text;
};

export type TArgsOpenAttachedTextEditMode = {
  shapeNode: Konva.Shape;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTextNode(portal: TPortalAttachedText, containerId: string) {
  const node = portal.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof portal.Konva.Text && candidate.getAttr("vcContainerId") === containerId;
  });

  return node instanceof portal.Konva.Text ? node : null;
}

function createAttachedTextElement(portal: TPortalAttachedText, shapeNode: Konva.Shape): TElement {
  const bounds = fxGetShapeTextHostBounds({
    Rect: portal.Konva.Rect,
    Ellipse: portal.Konva.Ellipse,
    Line: portal.Konva.Line,
    node: shapeNode,
  });
  if (!bounds) {
    throw new Error("Unsupported shape text host");
  }

  const now = portal.now();

  return {
    id: portal.createId(),
    x: bounds.x,
    y: bounds.y,
    rotation: bounds.rotation,
    bindings: [],
    locked: false,
    parentGroupId: fxGetCanvasParentGroupId({}, { editor: portal.editor, node: shapeNode }),
    zIndex: "",
    createdAt: now,
    updatedAt: now,
    style: {
      opacity: shapeNode.opacity(),
    },
    data: {
      type: "text",
      w: Math.max(4, bounds.width),
      h: Math.max(4, bounds.height),
      text: "",
      originalText: "",
      fontSize: clamp(bounds.height * 0.35, 14, 24),
      fontFamily: "Arial",
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: 1.2,
      link: null,
      containerId: shapeNode.id(),
      autoResize: false,
    } satisfies TTextData,
  } satisfies TElement;
}

function fxCreateAttachedTextNode(portal: TPortalAttachedText, args: TArgsGetAttachedTextNode) {
  const node = portal.editor.createShapeFromTElement(createAttachedTextElement(portal, args.shapeNode));
  if (!(node instanceof portal.Konva.Text)) {
    return null;
  }

  fxSyncAttachedTextNodeToShape(portal, { shapeNode: args.shapeNode, textNode: node });
  const parentNode = args.shapeNode.getParent();
  const parent = parentNode instanceof portal.Konva.Layer || fxIsCanvasGroupNode({}, { editor: portal.editor, node: parentNode })
    ? parentNode
    : portal.scene.staticForegroundLayer;
  if (!(parent instanceof portal.Konva.Layer) && !(parent instanceof portal.Konva.Group)) {
    return null;
  }

  parent.add(node);
  portal.renderOrder.assignOrderOnInsert({
    parent,
    nodes: [args.shapeNode, node],
    position: "front",
  });
  return node;
}

export function fxGetAttachedTextNode(portal: TPortalAttachedText, args: TArgsGetAttachedTextNode) {
  return getTextNode(portal, args.shapeNode.id());
}

export function fxSyncAttachedTextNodeToShape(portal: TPortalAttachedText, args: TArgsSyncAttachedTextNodeToShape) {
  const bounds = fxGetShapeTextHostBounds({
    Rect: portal.Konva.Rect,
    Ellipse: portal.Konva.Ellipse,
    Line: portal.Konva.Line,
    node: args.shapeNode,
  });
  if (!bounds) {
    return null;
  }

  const parentNode = args.shapeNode.getParent();
  if (parentNode && args.textNode.getParent() !== parentNode) {
    parentNode.add(args.textNode);
  }

  args.textNode.position({ x: bounds.x, y: bounds.y });
  args.textNode.rotation(bounds.rotation);
  args.textNode.width(Math.max(4, bounds.width));
  args.textNode.height(Math.max(4, bounds.height));
  args.textNode.opacity(args.shapeNode.opacity());
  args.textNode.draggable(false);
  args.textNode.listening(false);
  args.textNode.name(ATTACHED_TEXT_NAME);
  args.textNode.setAttr("vcContainerId", args.shapeNode.id());
  args.textNode.setAttr("vcTextAutoResize", false);
  return args.textNode;
}

export function fxPersistAttachedTextNode(portal: TPortalAttachedText, args: TArgsPersistAttachedTextNode) {
  args.textNode.draggable(false);
  args.textNode.listening(false);
  args.textNode.name(ATTACHED_TEXT_NAME);
  const element = portal.editor.toElement(args.textNode);
  if (!element || element.data.type !== "text") {
    return null;
  }

  const builder = portal.crdt.build();
  builder.patchElement(element.id, element);
  builder.commit();
  return element;
}

export function fxOpenAttachedTextEditMode(portal: TPortalAttachedText, args: TArgsOpenAttachedTextEditMode) {
  if (portal.selection.mode !== "select") {
    return false;
  }

  if (portal.editor.editingTextId !== null) {
    return false;
  }

  let textNode = fxGetAttachedTextNode(portal, { shapeNode: args.shapeNode });
  const isNew = textNode === null;
  if (!textNode) {
    textNode = fxCreateAttachedTextNode(portal, { shapeNode: args.shapeNode });
  }

  if (!textNode) {
    return false;
  }

  fxSyncAttachedTextNodeToShape(portal, { shapeNode: args.shapeNode, textNode });
  fxPersistAttachedTextNode(portal, { textNode });
  portal.enterEditMode({
    freeTextName: ATTACHED_TEXT_NAME,
    node: textNode,
    isNew,
  });

  const TextArea = portal.document.defaultView?.HTMLTextAreaElement;
  const textarea = portal.scene.stage.container().querySelector("textarea");
  if (TextArea && textarea instanceof TextArea) {
    textarea.addEventListener("blur", () => {
      const nextTextNode = fxGetAttachedTextNode(portal, { shapeNode: args.shapeNode });
      if (!nextTextNode) {
        return;
      }

      fxSyncAttachedTextNodeToShape(portal, { shapeNode: args.shapeNode, textNode: nextTextNode });
      fxPersistAttachedTextNode(portal, { textNode: nextTextNode });
      portal.selection.setSelection([args.shapeNode]);
      portal.selection.setFocusedNode(args.shapeNode);
      portal.scene.staticForegroundLayer.batchDraw();
    }, { once: true });
  }

  return true;
}
