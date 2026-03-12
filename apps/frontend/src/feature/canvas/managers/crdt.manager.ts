import type { DocHandle } from "@automerge/automerge-repo";
import {
  getElementsSortedByZ,
  type TCanvasDoc,
  type TElementData,
  type TElementStyle,
  type TElement,
} from "@vibecanvas/shell/automerge/types/canvas-doc";
import Konva from "konva";
import { getStrokePathFromPenData } from "../utils/stroke-renderer";

type TCrdtManagerArgs = {
  handle: DocHandle<TCanvasDoc>;
  worldShapes: Konva.Group;
  onReconcile?: () => void;
};

type TCrdtElementDraft = {
  id?: string;
  x: number;
  y: number;
  angle?: number;
  parentGroupId?: string | null;
  locked?: boolean;
  data: TElementData;
  style?: TElementStyle;
};

const DEFAULT_PEN_FILL = "#0f172a";
const DEFAULT_PEN_OPACITY = 0.92;

export class CrdtManager {
  #handle: DocHandle<TCanvasDoc>;
  #worldShapes: Konva.Group;
  #onReconcile: (() => void) | null;
  #penNodes = new Map<string, Konva.Path>();

  readonly #onChange = () => {
    this.reconcileFromDoc();
  };

  constructor(args: TCrdtManagerArgs) {
    this.#handle = args.handle;
    this.#worldShapes = args.worldShapes;
    this.#onReconcile = args.onReconcile ?? null;
  }

  mount() {
    if (!this.#handle) return;
    this.reconcileFromDoc();
    this.#handle.on("change", this.#onChange);
  }

  destroy() {
    if (this.#handle) {
      this.#handle.off("change", this.#onChange);
    }

    for (const node of this.#penNodes.values()) {
      node.destroy();
    }

    this.#penNodes.clear();
  }

  createElement(draft: TCrdtElementDraft) {
    const timestamp = Date.now();
    const id = draft.id ?? `${draft.data.type}-${crypto.randomUUID()}`;

    this.#handle.change((doc) => {
      doc.elements[id] = {
        id,
        x: draft.x,
        y: draft.y,
        angle: draft.angle ?? 0,
        zIndex: `${timestamp}:${id}`,
        parentGroupId: draft.parentGroupId ?? null,
        bindings: [],
        locked: draft.locked ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
        data: draft.data,
        style: draft.data.type === "pen"
          ? {
              backgroundColor: DEFAULT_PEN_FILL,
              opacity: DEFAULT_PEN_OPACITY,
              ...draft.style,
            }
          : (draft.style ?? {}),
      };
    });
  }

  reconcileFromDoc() {
    if (!this.#handle) return;
    const doc = this.#handle.docSync();
    if (!doc) return;

    const penElements = getElementsSortedByZ(doc).filter((element) => element.data.type === "pen");
    const nextIds = new Set(penElements.map((element) => element.id));

    for (const [nodeId, node] of this.#penNodes) {
      if (nextIds.has(nodeId)) continue;
      node.destroy();
      this.#penNodes.delete(nodeId);
    }

    for (const element of penElements) {
      this.#upsertPenNode(element);
    }

    this.#onReconcile?.();
    this.#worldShapes.getLayer()?.batchDraw();
  }

  #upsertPenNode(element: TElement) {
    if (element.data.type !== "pen") return;

    const pathData = getStrokePathFromPenData(element);
    const fill = element.style.backgroundColor ?? element.style.strokeColor ?? DEFAULT_PEN_FILL;
    const opacity = element.style.opacity ?? DEFAULT_PEN_OPACITY;

    const existingNode = this.#penNodes.get(element.id);
    if (existingNode) {
      existingNode.setAttrs({
        id: element.id,
        x: element.x,
        y: element.y,
        data: pathData,
        fill,
        opacity,
        rotation: element.angle,
        visible: Boolean(pathData),
        vcSelectable: true,
        vcTransformable: true,
      });
      existingNode.moveToTop();
      return;
    }

    const node = new Konva.Path({
      id: element.id,
      x: element.x,
      y: element.y,
      data: pathData,
      fill,
      opacity,
      rotation: element.angle,
      visible: Boolean(pathData),
    });

    this.#worldShapes.add(node);
    node.moveToTop();
    this.#penNodes.set(element.id, node);
    node.setAttrs({
      vcSelectable: true,
      vcTransformable: true,
    });
  }
}

export type { TCrdtElementDraft, TCrdtManagerArgs };
