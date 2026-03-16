import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { produce } from "solid-js/store";
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
        case CustomEvents.ELEMENT_POINTERDOWN: SelectPlugin.handleElementPointerDown(context, payload); break;
        case CustomEvents.ELEMENT_POINTERDBLCLICK: SelectPlugin.handleElementDoubleClick(context, payload); break;
      }

      return false;
    });

    context.hooks.pointerDown.tap((e) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const pointer = getSelectionLayerPointerPosition(context);
      if (!pointer) return;
      if (e.target !== context.stage) return;

      this.#selectionRectangle.visible(true);
      this.#selectionRectangle.position(pointer);
      this.#selectionRectangle.size({ width: 0, height: 0 });
      this.#selectionRectangle.moveToTop();

      context.setState('selection', []);

      context.dynamicLayer.batchDraw();
    });

    context.hooks.pointerMove.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT || !this.#selectionRectangle.visible()) return;
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

      context.dynamicLayer.batchDraw();
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(false);
      context.dynamicLayer.batchDraw();
    });
  }

  private static handleElementPointerDown(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>) {
    const isRoot = payload.currentTarget.parent === context.staticForegroundLayer
    if (payload.currentTarget instanceof Konva.Shape) {
      if (isRoot && !context.state.selection.includes(payload.currentTarget)) {
        console.log('shape', payload)
        if (!payload.evt.shiftKey) context.setState('selection', [payload.currentTarget])
        else context.setState('selection', produce(sel => sel.push(payload.currentTarget)))
      }
    } else if (payload.currentTarget instanceof Konva.Group) {
      if (isRoot && !context.state.selection.includes(payload.currentTarget)) {
        console.log('group', payload)
        if (!payload.evt.shiftKey) context.setState('selection', [payload.currentTarget])
        else context.setState('selection', produce(sel => sel.push(payload.currentTarget)))
      }
    }
  }

  private static handleElementDoubleClick(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>) {
    const isRoot = payload.currentTarget.parent === context.staticForegroundLayer

    console.log('select plugin handle dbl click', isRoot, payload)

  }
}
