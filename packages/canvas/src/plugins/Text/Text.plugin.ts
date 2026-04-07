import { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { ATTACHED_TEXT_NAME, FREE_TEXT_NAME } from "./Text.constants";
import { createCloneDrag, createPreviewClone, finalizePreviewClone, safeStopDrag } from "./Text.clone";
import { enterEditMode } from "./Text.editing";
import { setupShapeListeners } from "./Text.listeners";
import { createTextNode, setupTextCapabilities, toTElement, updateTextFromElement } from "./Text.serialization";
import {
  computeTextHeight,
  computeTextWidth,
  findAttachedContainerRect,
  findAttachedTextByContainerId,
  getAttachedTextPadding,
  getContainerId,
  isAttachedTextNode,
  syncAttachedTextToRect,
} from "./Text.shared";

export class TextPlugin implements IPlugin {
  #activeTool: TTool = 'select';
  static readonly ATTACHED_TEXT_NAME = ATTACHED_TEXT_NAME;
  static readonly FREE_TEXT_NAME = FREE_TEXT_NAME;

  apply(context: IPluginContext): void {
    this.setupClickCreate(context);
    setupTextCapabilities(context, {
      createTextNode: TextPlugin.createTextNode,
      setupShapeListeners: TextPlugin.setupShapeListeners,
      toTElement: TextPlugin.toTElement,
      updateTextFromElement: TextPlugin.updateTextFromElement,
    });
  }

  private setupClickCreate(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event === CustomEvents.TOOL_SELECT) {
        this.#activeTool = payload as TTool;
      }
      return false;
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.CLICK_CREATE) return;
      if (this.#activeTool !== 'text') return;

      const pointer = context.staticForegroundLayer.getRelativePointerPosition();
      if (!pointer) return;

      const id = crypto.randomUUID();
      const element: TElement = {
        id,
        x: pointer.x,
        y: pointer.y,
        rotation: 0,
        bindings: [],
        locked: false,
        parentGroupId: null,
        zIndex: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        style: {},
        data: {
          type: 'text',
          w: 200,
          h: 24,
          text: '',
          originalText: '',
          fontSize: 16,
          fontFamily: 'Arial',
          textAlign: 'left',
          verticalAlign: 'top',
          lineHeight: 1.2,
          link: null,
          containerId: null,
          autoResize: true,
        },
      };

      const textNode = TextPlugin.createTextNode(element);
      textNode.draggable(true);
      TextPlugin.setupShapeListeners(context, textNode);
      context.staticForegroundLayer.add(textNode);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [textNode],
        position: "front",
      });

      // Switch back to select before entering edit mode
      context.setState('mode', CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, 'select');

      TextPlugin.enterEditMode(context, textNode, true);
    });
  }

  static createTextNode(element: TElement): Konva.Text {
    return createTextNode(element);
  }

  static getContainerId(node: Konva.Node): string | null {
    return getContainerId(node);
  }

  static isAttachedTextNode(node: Konva.Node): node is Konva.Text {
    return isAttachedTextNode(node);
  }

  static findAttachedTextByContainerId(context: IPluginContext, containerId: string): Konva.Text | null {
    return findAttachedTextByContainerId(context, containerId);
  }

  static findAttachedContainerRect(context: IPluginContext, containerId: string): Konva.Rect | null {
    return findAttachedContainerRect(context, containerId);
  }

  static getAttachedTextPadding(rect: Konva.Rect): number {
    return getAttachedTextPadding(rect);
  }

  static syncAttachedTextToRect(rect: Konva.Rect, node: Konva.Text) {
    return syncAttachedTextToRect(rect, node);
  }

  static computeTextWidth(node: Konva.Text, text: string): number {
    return computeTextWidth(node, text);
  }

  static toTElement(node: Konva.Text): TElement {
    return toTElement(node);
  }

  static computeTextHeight(node: Konva.Text, text: string): number {
    return computeTextHeight(node, text);
  }

  static updateTextFromElement(node: Konva.Text, element: TElement) {
    return updateTextFromElement(node, element);
  }

  static setupShapeListeners(context: IPluginContext, node: Konva.Text) {
    return setupShapeListeners(context, node, {
      createCloneDrag: TextPlugin.createCloneDrag,
      enterEditMode: TextPlugin.enterEditMode,
      safeStopDrag: TextPlugin.safeStopDrag,
      toTElement: TextPlugin.toTElement,
    });
  }

  static enterEditMode(context: IPluginContext, node: Konva.Text, isNew: boolean) {
    return enterEditMode(context, node, isNew, {
      computeTextHeight: TextPlugin.computeTextHeight,
      computeTextWidth: TextPlugin.computeTextWidth,
      findAttachedContainerRect: TextPlugin.findAttachedContainerRect,
      getContainerId: TextPlugin.getContainerId,
      syncAttachedTextToRect: TextPlugin.syncAttachedTextToRect,
      toTElement: TextPlugin.toTElement,
    });
  }

  static createPreviewClone(node: Konva.Text) {
    return createPreviewClone(node);
  }

  static createCloneDrag(context: IPluginContext, node: Konva.Text) {
    return createCloneDrag(context, node, {
      createPreviewClone: TextPlugin.createPreviewClone,
      finalizePreviewClone: TextPlugin.finalizePreviewClone,
    });
  }

  static finalizePreviewClone(context: IPluginContext, previewClone: Konva.Text) {
    return finalizePreviewClone(context, previewClone, {
      setupShapeListeners: TextPlugin.setupShapeListeners,
      toTElement: TextPlugin.toTElement,
    });
  }

  static safeStopDrag(node: Konva.Node) {
    return safeStopDrag(node);
  }
}
