import Konva from "konva";
import type { KonvaEventObject, Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import type { Group } from "konva/lib/Group";

function getSelectionLayerPointerPosition(context: IPluginContext) {
  const pointer = context.dynamicLayer.getRelativePointerPosition();
  if (!pointer) return null;

  return pointer;
}

function hasSameSelectionOrder(
  currentSelection: Array<{ id(): string }>,
  nextSelection: Array<{ id(): string }>,
) {
  if (currentSelection.length != nextSelection.length) return false;

  return currentSelection.every((node, index) => node.id() === nextSelection[index]?.id());
}

function getSelectionPath(
  context: IPluginContext,
  node: Konva.Group | Konva.Shape,
): Array<Konva.Group | Konva.Shape> {
  const path: Array<Konva.Group | Konva.Shape> = [];
  let current: Konva.Node | null = node;

  while (current && current !== context.staticForegroundLayer) {
    if (current instanceof Konva.Group || current instanceof Konva.Shape) {
      path.push(current);
    }

    current = current.parent;
  }

  return path.reverse();
}

function isSelectionPathPrefix(
  currentSelection: Array<Konva.Group | Konva.Shape>,
  path: Array<Konva.Group | Konva.Shape>,
) {
  if (currentSelection.length > path.length) return false;

  return currentSelection.every((node, index) => node === path[index]);
}

export class SelectPlugin implements IPlugin {
  #selectionRectangle: Konva.Rect;

  constructor() {
    this.#selectionRectangle = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      context.dynamicLayer.add(this.#selectionRectangle);
    })

    context.hooks.customEvent.tap((event, payload) => {
      if (context.state.mode !== CanvasMode.SELECT) return false;
      switch (event) {
        case CustomEvents.ELEMENT_POINTERDOWN: return SelectPlugin.handleElementPointerDown(context, payload); break;
        case CustomEvents.ELEMENT_POINTERDBLCLICK: return SelectPlugin.handleElementDoubleClick(context, payload); break;
      }

      return false;
    });

    context.hooks.pointerDown.tap((e) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.handlePointerDown(context, e)
    });

    context.hooks.pointerMove.tap((e) => {
      if (context.state.mode !== CanvasMode.SELECT || !this.#selectionRectangle.visible()) return;
      this.handlePointerMove(context, e)
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(false);
    });

  }

  private static handleElementPointerDown(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>) {
    const path = getSelectionPath(context, payload.currentTarget);
    const nextDepth = Math.min(Math.max(context.state.selection.length, 1), path.length);
    const nextSelection = path.slice(0, nextDepth);

    if (!hasSameSelectionOrder(context.state.selection, nextSelection)) {
      context.setState('selection', nextSelection)
    }

    return true
  }

  private static handleElementDoubleClick(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>): boolean {
    const path = getSelectionPath(context, payload.currentTarget);

    if (isSelectionPathPrefix(context.state.selection, path) && context.state.selection.length < path.length) {
      context.setState('selection', path.slice(0, context.state.selection.length + 1))
      return true
    }

    return false
  }

  private handlePointerDown(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Node>) {
    const pointer = getSelectionLayerPointerPosition(context);
    if (!pointer) return;
    if (payload.target !== context.stage) return;

    this.#selectionRectangle.visible(true);
    this.#selectionRectangle.position(pointer);
    this.#selectionRectangle.size({ width: 0, height: 0 });
    this.#selectionRectangle.moveToTop();

    context.setState('selection', []);
  }

  private handlePointerMove(context: IPluginContext, payload: KonvaEventObject<MouseEvent, Node>) {
    const pointer = getSelectionLayerPointerPosition(context);
    if (!pointer) return;

    this.#selectionRectangle.size({
      width: pointer.x - this.#selectionRectangle.x(),
      height: pointer.y - this.#selectionRectangle.y(),
    });

    const topNodes = context.staticForegroundLayer.getChildren(item => item.parent?.id === context.staticForegroundLayer.id)
    const inSelection = topNodes.filter(node => {
      return Konva.Util.haveIntersection(node.getClientRect(), this.#selectionRectangle.getClientRect());
    }).sort((a, b) => a.id().localeCompare(b.id()))

    if (!hasSameSelectionOrder(context.state.selection, inSelection)) {
      context.setState('selection', inSelection);
    }
  }

}
