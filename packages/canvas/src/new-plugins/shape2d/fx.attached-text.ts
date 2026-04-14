import { txEnterEditMode } from "../text/tx.enter-edit-mode";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { ThemeService } from "@vibecanvas/service-theme";
import { fxGetShapeTextHostBounds } from "./fn.text-host-bounds";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxGetCanvasParentGroupId, fxIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";

export const ATTACHED_TEXT_NAME = "attached-text";

export type TPortalAttachedText = {
  crdt: CrdtService;
  document: Document;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
  createId: () => string;
  now: () => number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTextNode(render: SceneService, containerId: string) {
  const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof render.Text && candidate.getAttr("vcContainerId") === containerId;
  });

  return node instanceof render.Text ? node : null;
}

function createAttachedTextElement(portal: TPortalAttachedText, shapeNode: Konva.Shape): TElement {
  const bounds = fxGetShapeTextHostBounds({ render: portal.render, node: shapeNode });
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
    parentGroupId: fxGetCanvasParentGroupId({ editor: portal.editor, node: shapeNode }),
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

export function fxGetAttachedTextNode(portal: TPortalAttachedText, shapeNode: Konva.Shape) {
  return getTextNode(portal.render, shapeNode.id());
}

export function fxSyncAttachedTextNodeToShape(portal: TPortalAttachedText, shapeNode: Konva.Shape, textNode: Konva.Text) {
  const bounds = fxGetShapeTextHostBounds({ render: portal.render, node: shapeNode });
  if (!bounds) {
    return null;
  }

  const parent = shapeNode.getParent();

  if (parent && textNode.getParent() !== parent) {
    parent.add(textNode);
  }

  textNode.position({ x: bounds.x, y: bounds.y });
  textNode.rotation(bounds.rotation);
  textNode.width(Math.max(4, bounds.width));
  textNode.height(Math.max(4, bounds.height));
  textNode.opacity(shapeNode.opacity());
  textNode.draggable(false);
  textNode.listening(false);
  textNode.name(ATTACHED_TEXT_NAME);
  textNode.setAttr("vcContainerId", shapeNode.id());
  textNode.setAttr("vcTextAutoResize", false);
  return textNode;
}

export function fxCreateAttachedTextNode(portal: TPortalAttachedText, shapeNode: Konva.Shape) {
  const node = portal.editor.createShapeFromTElement(createAttachedTextElement(portal, shapeNode));
  if (!(node instanceof portal.render.Text)) {
    return null;
  }

  fxSyncAttachedTextNodeToShape(portal, shapeNode, node);
  const parentNode = shapeNode.getParent();
  const parent = parentNode instanceof portal.render.Layer || fxIsCanvasGroupNode({ editor: portal.editor, node: parentNode })
    ? parentNode
    : portal.render.staticForegroundLayer;
  const parentContainer = parent as Konva.Layer | Konva.Group;

  parentContainer.add(node);

  portal.renderOrder.assignOrderOnInsert({
    parent: parentContainer,
    nodes: [shapeNode, node],
    position: "front",
  });
  return node;
}

export function fxPersistAttachedTextNode(portal: TPortalAttachedText, textNode: Konva.Text) {
  textNode.draggable(false);
  textNode.listening(false);
  textNode.name(ATTACHED_TEXT_NAME);
  const element = portal.editor.toElement(textNode);
  if (!element || element.data.type !== "text") {
    return null;
  }

  portal.crdt.patch({ elements: [element], groups: [] });
  return element;
}

export function fxOpenAttachedTextEditMode(portal: TPortalAttachedText, shapeNode: Konva.Shape) {
  if (portal.selection.mode !== "select") {
    return false;
  }

  if (portal.editor.editingTextId !== null) {
    return false;
  }

  let textNode = fxGetAttachedTextNode(portal, shapeNode);
  const isNew = textNode === null;
  if (!textNode) {
    textNode = fxCreateAttachedTextNode(portal, shapeNode);
  }

  if (!textNode) {
    return false;
  }

  fxSyncAttachedTextNodeToShape(portal, shapeNode, textNode);
  fxPersistAttachedTextNode(portal, textNode);
  txEnterEditMode({
    crdt: portal.crdt,
    document: portal.document,
    editor: portal.editor,
    history: portal.history,
    render: portal.render,
    selection: portal.selection,
    theme: portal.theme,
  }, {
    freeTextName: ATTACHED_TEXT_NAME,
    node: textNode,
    isNew,
  });

  const textarea = portal.render.stage.container().querySelector("textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.addEventListener("blur", () => {
      const nextTextNode = fxGetAttachedTextNode(portal, shapeNode);
      if (!nextTextNode) {
        return;
      }

      fxSyncAttachedTextNodeToShape(portal, shapeNode, nextTextNode);
      fxPersistAttachedTextNode(portal, nextTextNode);
      portal.selection.setSelection([shapeNode]);
      portal.selection.setFocusedNode(shapeNode);
      portal.render.staticForegroundLayer.batchDraw();
    }, { once: true });
  }

  return true;
}
