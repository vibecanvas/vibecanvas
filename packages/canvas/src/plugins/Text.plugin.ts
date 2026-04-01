import { TElement, TElementStyle, TTextData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { throttle } from "@solid-primitives/scheduled";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { startSelectionCloneDrag } from "./clone-drag";
import { getWorldPosition, setWorldPosition } from "./node-space";
import { TransformPlugin } from "./Transform.plugin";
import { getNodeZIndex, setNodeZIndex } from "./render-order.shared";

export class TextPlugin implements IPlugin {
  #activeTool: TTool = 'select';
  static readonly ATTACHED_TEXT_NAME = 'attached-text';
  static readonly FREE_TEXT_NAME = 'free-text';

  apply(context: IPluginContext): void {
    this.setupClickCreate(context);
    TextPlugin.setupCapabilities(context);
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

  private static setupCapabilities(context: IPluginContext) {
    const prevCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (element.data.type !== 'text') return prevCreate?.(element) ?? null;
      const node = TextPlugin.createTextNode(element);
      TextPlugin.setupShapeListeners(context, node);
      node.draggable(element.data.containerId === null);
      return node;
    };

    const prevToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (node instanceof Konva.Text) return TextPlugin.toTElement(node);
      return prevToElement?.(node) ?? null;
    };

    const prevUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (element.data.type !== 'text') return prevUpdate?.(element) ?? null;
      const node = context.staticForegroundLayer.findOne(
        (n: Konva.Node) => n.id() === element.id
      ) as Konva.Text | null;
      if (!node) return null;
      TextPlugin.updateTextFromElement(node, element);
      return node;
    };
  }

  static createTextNode(element: TElement): Konva.Text {
    const data = element.data as TTextData;
    const isAttached = data.containerId !== null;
    const node = new Konva.Text({
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      width: data.w,
      height: data.h,
      text: data.text,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      align: data.textAlign,
      verticalAlign: data.verticalAlign,
      lineHeight: data.lineHeight,
      wrap: isAttached ? 'word' : 'none',
      draggable: false,
      listening: !isAttached,
      fill: element.style.strokeColor ?? '#000000',
      opacity: element.style.opacity ?? 1,
    });

    node.name(isAttached ? TextPlugin.ATTACHED_TEXT_NAME : TextPlugin.FREE_TEXT_NAME);
    node.setAttr('vcContainerId', data.containerId);
    setNodeZIndex(node, element.zIndex);

    return node;
  }

  static getContainerId(node: Konva.Node): string | null {
    const containerId = node.getAttr('vcContainerId');
    return typeof containerId === 'string' ? containerId : null;
  }

  static isAttachedTextNode(node: Konva.Node): node is Konva.Text {
    return node instanceof Konva.Text && TextPlugin.getContainerId(node) !== null;
  }

  static findAttachedTextByContainerId(context: IPluginContext, containerId: string): Konva.Text | null {
    const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && TextPlugin.getContainerId(candidate) === containerId;
    });

    return node instanceof Konva.Text ? node : null;
  }

  static findAttachedContainerRect(context: IPluginContext, containerId: string): Konva.Rect | null {
    const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Rect && candidate.id() === containerId;
    });

    return node instanceof Konva.Rect ? node : null;
  }

  static getAttachedTextPadding(rect: Konva.Rect): number {
    return Math.min(16, Math.max(8, Math.min(rect.width(), rect.height()) * 0.12));
  }

  static syncAttachedTextToRect(rect: Konva.Rect, node: Konva.Text) {
    node.setAttrs({
      x: rect.x(),
      y: rect.y(),
      rotation: rect.rotation(),
      width: Math.max(4, rect.width()),
      height: Math.max(4, rect.height()),
      align: 'center',
      verticalAlign: 'middle',
      wrap: 'word',
      draggable: false,
      listening: false,
      padding: TextPlugin.getAttachedTextPadding(rect),
      scaleX: rect.scaleX(),
      scaleY: rect.scaleY(),
    });
  }

  static computeTextWidth(node: Konva.Text, text: string): number {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return Math.max(node.width(), 4);

    context.font = `${node.fontSize()}px ${node.fontFamily()}`;
    const maxLineWidth = text.split('\n').reduce((max, line) => {
      return Math.max(max, context.measureText(line).width);
    }, 0);

    return Math.ceil(maxLineWidth) + node.padding() * 2;
  }

  static toTElement(node: Konva.Text): TElement {
    const worldPosition = getWorldPosition(node);
    const absScale = node.getAbsoluteScale();
    const layer = node.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    const parent = node.getParent();
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

    const style: TElementStyle = {
      opacity: node.opacity(),
    };

    if (typeof node.fill() === 'string') {
      style.strokeColor = node.fill() as string;
    }

    const data: TTextData = {
      type: 'text',
      w: node.width() * (absScale.x / layerScaleX),
      h: node.height() * (absScale.y / layerScaleY),
      text: node.text(),
      originalText: node.text(),
      fontSize: node.fontSize(),
      fontFamily: node.fontFamily(),
      textAlign: node.align() as TTextData['textAlign'],
      verticalAlign: node.verticalAlign() as TTextData['verticalAlign'],
      lineHeight: node.lineHeight(),
      link: null,
      containerId: TextPlugin.getContainerId(node),
      autoResize: false,
    };

    return {
      id: node.id(),
      x: worldPosition.x,
      y: worldPosition.y,
      rotation: node.getAbsoluteRotation(),
      bindings: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      locked: false,
      parentGroupId,
      zIndex: getNodeZIndex(node),
      style,
      data,
    };
  }

  /**
   * Compute text height robustly.
   * Uses explicit newline count as a floor so hidden-node stale measurement
   * cannot shrink the result below the number of actual lines.
   */
  static computeTextHeight(node: Konva.Text, text: string): number {
    const lineCount = (text.match(/\n/g)?.length ?? 0) + 1;
    return Math.ceil(lineCount * node.fontSize() * node.lineHeight()) + node.padding() * 2;
  }

  static updateTextFromElement(node: Konva.Text, element: TElement) {
    const data = element.data as TTextData;
    setWorldPosition(node, { x: element.x, y: element.y });
    node.rotation(element.rotation);
    node.width(data.w);
    node.height(data.h);
    node.text(data.text);
    node.fontSize(data.fontSize);
    node.fontFamily(data.fontFamily);
    node.align(data.textAlign);
    node.verticalAlign(data.verticalAlign);
    node.lineHeight(data.lineHeight);
    node.opacity(element.style.opacity ?? 1);
    node.fill(element.style.strokeColor ?? '#000000');
    setNodeZIndex(node, element.zIndex);
    node.scaleX(1);
    node.scaleY(1);
    node.wrap(data.containerId !== null ? 'word' : 'none');
    node.listening(data.containerId === null);
    node.draggable(data.containerId === null);
    node.name(data.containerId !== null ? TextPlugin.ATTACHED_TEXT_NAME : TextPlugin.FREE_TEXT_NAME);
    node.setAttr('vcContainerId', data.containerId);
  }

  static setupShapeListeners(context: IPluginContext, node: Konva.Text) {
    let originalElement: TElement | null = null;
    let isCloneDrag = false;
    const multiDragStartPositions = new Map<string, { x: number; y: number }>();
    const passengerOriginalElements = new Map<string, TElement[]>();

    node.on('pointerclick', (e) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, e);
    });

    node.on('pointerdown dragstart', (e) => {
      if (context.state.mode !== CanvasMode.SELECT) {
        node.stopDrag();
        return;
      }
      if (e.type === 'pointerdown') {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e);
        if (earlyExit) e.cancelBubble = true;
      }

      if (e.type === 'dragstart' && e.evt?.altKey) {
        isCloneDrag = true;
        TextPlugin.safeStopDrag(node);
        if (startSelectionCloneDrag(context, node)) {
          isCloneDrag = false;
          return;
        }
        TextPlugin.createCloneDrag(context, node);
      }
    });

    node.on('pointerdblclick', (e) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      // Route through the customEvent system first so SelectPlugin can handle
      // group drilling (g → t) before we enter edit mode.
      // Only enter edit mode when the node is already the deepest focused selection
      // (SelectPlugin returns false, meaning no further drilling is possible).
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e);
      if (earlyExit) {
        e.cancelBubble = true;
        return;
      }
      TextPlugin.enterEditMode(context, node, false);
      e.cancelBubble = true;
    });

    const applyElement = (element: TElement) => {
      context.capabilities.updateShapeFromTElement?.(element);
      let parent = node.getParent();
      while (parent instanceof Konva.Group) {
        parent.fire('transform');
        parent = parent.getParent();
      }
    };

    const throttledPatch = throttle((element: TElement) => {
      context.crdt.patch({ elements: [element], groups: [] });
    }, 100);

    node.on('dragstart', (e) => {
      if (isCloneDrag || e.evt?.altKey) return;
      originalElement = TextPlugin.toTElement(node);
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      const selected = TransformPlugin.filterSelection(context.state.selection);
      selected.forEach((n) => {
        multiDragStartPositions.set(n.id(), { ...n.absolutePosition() });
        if (n === node) return;
        if (n instanceof Konva.Shape) {
          const el = context.capabilities.toElement?.(n);
          if (el) passengerOriginalElements.set(n.id(), [structuredClone(el)]);
        } else if (n instanceof Konva.Group) {
          const childEls = (n.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          passengerOriginalElements.set(n.id(), structuredClone(childEls));
        }
      });
    });

    // Bake scaleX/scaleY into fontSize/width/height in real-time during transformer resize.
    // Scaling fontSize (not reflowing at a narrower width) keeps the text layout intact —
    // same number of lines, no phantom empty space. keepRatio in TransformPlugin ensures
    // scaleX === scaleY for text nodes so a single scale factor is used for all attrs.
    node.on('transform', () => {
      const scale = node.scaleX(); // keepRatio guarantees scaleX ≈ scaleY
      node.setAttrs({
        width: node.width() * scale,
        height: node.height() * node.scaleY(),
        fontSize: Math.max(1, node.fontSize() * scale),
        scaleX: 1,
        scaleY: 1,
      });
    });

    node.on('dragmove', () => {
      if (isCloneDrag) return;
      throttledPatch(TextPlugin.toTElement(node));
      const selected = TransformPlugin.filterSelection(context.state.selection);
      if (selected.length <= 1) return;
      const start = multiDragStartPositions.get(node.id());
      if (!start) return;
      const cur = node.absolutePosition();
      const dx = cur.x - start.x;
      const dy = cur.y - start.y;
      selected.forEach((other) => {
        if (other === node) return;
        if (other.isDragging()) return;
        const os = multiDragStartPositions.get(other.id());
        if (!os) return;
        other.absolutePosition({ x: os.x + dx, y: os.y + dy });
      });
    });

    node.on('dragend', () => {
      if (isCloneDrag) {
        isCloneDrag = false;
        originalElement = null;
        multiDragStartPositions.clear();
        passengerOriginalElements.clear();
        return;
      }

      const nextElement = TextPlugin.toTElement(node);
      const beforeElement = originalElement ? structuredClone(originalElement) : null;
      const afterElement = structuredClone(nextElement);

      context.crdt.patch({ elements: [afterElement], groups: [] });

      const selected = TransformPlugin.filterSelection(context.state.selection);
      const passengers = selected.filter((n) => n !== node);
      const passengerAfterElements = new Map<string, TElement[]>();
      passengers.forEach((passenger) => {
        if (passenger instanceof Konva.Shape) {
          const el = context.capabilities.toElement?.(passenger);
          if (el) {
            const els = [structuredClone(el)];
            passengerAfterElements.set(passenger.id(), els);
            context.crdt.patch({ elements: els, groups: [] });
          }
        } else if (passenger instanceof Konva.Group) {
          const childEls = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          const cloned = structuredClone(childEls);
          passengerAfterElements.set(passenger.id(), cloned);
          if (cloned.length > 0) context.crdt.patch({ elements: cloned, groups: [] });
        }
      });

      if (!beforeElement) return;

      const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
      const capturedStartPositions = new Map(multiDragStartPositions);
      const capturedPassengerOriginals = new Map(passengerOriginalElements);
      multiDragStartPositions.clear();
      originalElement = null;
      if (!didMove) return;

      context.history.record({
        label: 'drag-text',
        undo() {
          applyElement(beforeElement);
          context.crdt.patch({ elements: [beforeElement], groups: [] });
          passengers.forEach((passenger) => {
            const startPos = capturedStartPositions.get(passenger.id());
            if (startPos) passenger.absolutePosition(startPos);
            const originalEls = capturedPassengerOriginals.get(passenger.id());
            if (originalEls && originalEls.length > 0) {
              context.crdt.patch({ elements: originalEls, groups: [] });
            }
          });
        },
        redo() {
          applyElement(afterElement);
          context.crdt.patch({ elements: [afterElement], groups: [] });
          passengers.forEach((passenger) => {
            const afterEls = passengerAfterElements.get(passenger.id());
            if (!afterEls || afterEls.length === 0) return;
            if (passenger instanceof Konva.Shape) {
              context.capabilities.updateShapeFromTElement?.(afterEls[0]);
              context.crdt.patch({ elements: afterEls, groups: [] });
            }
          });
        },
      });
    });
  }

  static enterEditMode(context: IPluginContext, node: Konva.Text, isNew: boolean) {
    const originalText = node.text();
    const containerId = TextPlugin.getContainerId(node);
    const isAttached = containerId !== null;
    const attachedRect = isAttached && containerId ? TextPlugin.findAttachedContainerRect(context, containerId) : null;
    const originalRectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
    const originalRectWidth = attachedRect?.width() ?? null;
    const originalRectHeight = attachedRect?.height() ?? null;
    const originalTextElement = TextPlugin.toTElement(node);
    context.setState('editingTextId', node.id());
    node.visible(false);
    context.stage.batchDraw();

    const textarea = document.createElement('textarea');
    const absPos = node.getAbsolutePosition();
    const absScale = node.getAbsoluteScale();
    const absRot = node.getAbsoluteRotation();

    // Match Konva text rendering: font size scaled by camera, correct family and spacing
    const scaledFontSize = node.fontSize() * absScale.x;
    const scaledWidth = Math.max(node.width() * absScale.x, 4);
    const scaledHeight = Math.max(node.height() * absScale.y, scaledFontSize);

    const getMinScreenHeight = (text: string) => {
      return Math.max(TextPlugin.computeTextHeight(node, text) * absScale.y, scaledFontSize);
    };
    const getMinScreenWidth = (text: string) => {
      return Math.max(TextPlugin.computeTextWidth(node, text) * absScale.x, 4);
    };

    textarea.value = node.text();
    textarea.rows = 1;
    Object.assign(textarea.style, {
      position: 'absolute',
      top: absPos.y + 'px',
      left: absPos.x + 'px',
      width: scaledWidth + 'px',
      height: getMinScreenHeight(textarea.value) + 'px',
      fontSize: scaledFontSize + 'px',
      fontFamily: node.fontFamily(),
      // lineHeight must be unitless to match Konva's rendering
      lineHeight: String(node.lineHeight()),
      transform: `rotate(${absRot}deg)`,
      transformOrigin: 'top left',
      whiteSpace: isAttached ? 'pre-wrap' : 'pre',
      wordBreak: isAttached ? 'break-word' : 'normal',
      outline: '2px solid #3b82f6',
      background: 'transparent',
      border: 'none',
      resize: 'none',
      // overflow visible so textarea grows with content
      overflow: 'hidden',
      padding: '0',
      boxSizing: 'border-box',
      zIndex: '9999',
      color: '#000000',
    });

    // Auto-grow textarea as user types.
    // Width tracks the longest explicit line so edit mode does not force-wrap single-line text.
    // Height follows current content, allowing deleted lines to shrink the box.
    const autoGrow = () => {
      if (isAttached) {
        textarea.style.width = scaledWidth + 'px';
      } else {
        textarea.style.width = 'auto';
        textarea.style.width = Math.max(textarea.scrollWidth, getMinScreenWidth(textarea.value)) + 'px';
      }
      textarea.style.height = 'auto';
      textarea.style.height = (isAttached ? Math.max(scaledHeight, textarea.scrollHeight) : Math.max(textarea.scrollHeight, getMinScreenHeight(textarea.value))) + 'px';
    };
    textarea.addEventListener('input', autoGrow);

    context.stage.container().appendChild(textarea);
    // Run once after insertion so scrollHeight reflects existing multiline content
    autoGrow();
    textarea.focus();
    textarea.select();

    const commit = () => {
      // Do NOT trim — preserve leading/trailing whitespace and newlines
      const newText = textarea.value;

      // Read the textarea's actual displayed size BEFORE removing it.
      // autoGrow() keeps this in sync with content.
      // Convert from screen-space back to node-space by dividing out the camera scale.
      const screenWidth = parseFloat(textarea.style.width) || getMinScreenWidth(newText);
      const screenHeight = parseFloat(textarea.style.height) || getMinScreenHeight(newText);
      const worldWidthFromTextarea = screenWidth / absScale.x;
      const worldHeightFromTextarea = screenHeight / absScale.y;

      textarea.removeEventListener('input', autoGrow);
      textarea.removeEventListener('keydown', onTextareaKeydown);
      textarea.removeEventListener('keyup', stopTextareaKeyPropagation);
      textarea.remove();
      context.setState('editingTextId', null);

      if (isNew && newText === '') {
        node.destroy();
        context.crdt.deleteById({ elementIds: [node.id()] });
        return;
      }

      // Use original text if user cleared everything on an existing node
      const textToSet = (!isNew && newText === '') ? originalText : newText;

      // Capture height before edit for undo
      node.text(textToSet);
      if (isAttached && attachedRect && originalRectWidth !== null && originalRectHeight !== null) {
        attachedRect.width(originalRectWidth);
        attachedRect.height(Math.max(originalRectHeight, worldHeightFromTextarea));
        TextPlugin.syncAttachedTextToRect(attachedRect, node);
      } else {
        node.width(Math.max(worldWidthFromTextarea, TextPlugin.computeTextWidth(node, textToSet)));
        node.height(Math.max(worldHeightFromTextarea, TextPlugin.computeTextHeight(node, textToSet)));
      }
      node.visible(true);
      context.stage.batchDraw();

      const textElement = TextPlugin.toTElement(node);
      const rectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
      context.crdt.patch({ elements: [rectElement, textElement].filter(Boolean) as TElement[], groups: [] });

      if (textToSet !== originalText) {
        const afterRectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
        const afterTextElement = TextPlugin.toTElement(node);
        context.history.record({
          label: 'edit-text',
          undo() {
            if (attachedRect && originalRectElement) {
              context.capabilities.updateShapeFromTElement?.(originalRectElement);
            }
            context.capabilities.updateShapeFromTElement?.(originalTextElement);
            context.crdt.patch({
              elements: [originalRectElement, originalTextElement].filter(Boolean) as TElement[],
              groups: [],
            });
          },
          redo() {
            if (attachedRect && afterRectElement) {
              context.capabilities.updateShapeFromTElement?.(afterRectElement);
            }
            context.capabilities.updateShapeFromTElement?.(afterTextElement);
            context.crdt.patch({
              elements: [afterRectElement, afterTextElement].filter(Boolean) as TElement[],
              groups: [],
            });
          },
        });
      }
    };

    const cancel = () => {
      textarea.removeEventListener('blur', commit);
      textarea.removeEventListener('input', autoGrow);
      textarea.removeEventListener('keydown', onTextareaKeydown);
      textarea.removeEventListener('keyup', stopTextareaKeyPropagation);
      textarea.remove();
      context.setState('editingTextId', null);
      if (isNew) {
        node.destroy();
        context.crdt.deleteById({ elementIds: [node.id()] });
      } else {
        node.visible(true);
        context.stage.batchDraw();
      }
    };

    const stopTextareaKeyPropagation = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    const onTextareaKeydown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        commit();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selectionStart = textarea.selectionStart ?? textarea.value.length;
        const selectionEnd = textarea.selectionEnd ?? selectionStart;
        textarea.setRangeText('\n', selectionStart, selectionEnd, 'end');
        autoGrow();
      }
    };

    textarea.addEventListener('blur', commit, { once: true });
    textarea.addEventListener('keydown', onTextareaKeydown);
    textarea.addEventListener('keyup', stopTextareaKeyPropagation);
  }

  static createPreviewClone(node: Konva.Text) {
    const clone = new Konva.Text(node.getAttrs());
    clone.id(crypto.randomUUID());
    clone.setDraggable(true);
    return clone;
  }

  static createCloneDrag(context: IPluginContext, node: Konva.Text) {
    const previewClone = TextPlugin.createPreviewClone(node);

    context.dynamicLayer.add(previewClone);
    previewClone.startDrag();
    const finalizeCloneDrag = () => {
      previewClone.off('dragend', finalizeCloneDrag);
      const cloned = TextPlugin.finalizePreviewClone(context, previewClone);
      context.setState('selection', cloned ? [cloned] : []);
    };
    previewClone.on('dragend', finalizeCloneDrag);

    return previewClone;
  }

  static finalizePreviewClone(context: IPluginContext, previewClone: Konva.Text) {
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }
    previewClone.moveTo(context.staticForegroundLayer);
    TextPlugin.setupShapeListeners(context, previewClone);
    previewClone.setDraggable(true);
    context.crdt.patch({ elements: [TextPlugin.toTElement(previewClone)], groups: [] });
    return previewClone;
  }

  static safeStopDrag(node: Konva.Node) {
    try {
      if (node.isDragging()) {
        node.stopDrag();
      }
    } catch {
      return;
    }
  }
}
