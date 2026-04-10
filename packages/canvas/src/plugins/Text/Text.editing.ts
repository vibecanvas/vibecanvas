import { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import {
  computeTextHeight,
  computeTextWidth,
  findAttachedContainerRect,
  getContainerId,
  syncAttachedTextToRect,
} from "./Text.shared";
import type { toTElement as toTElementType } from "./Text.serialization";

export function enterEditMode(
  context: IPluginContext,
  node: Konva.Text,
  isNew: boolean,
  deps: {
    computeTextHeight: typeof computeTextHeight;
    computeTextWidth: typeof computeTextWidth;
    findAttachedContainerRect: typeof findAttachedContainerRect;
    getContainerId: typeof getContainerId;
    syncAttachedTextToRect: typeof syncAttachedTextToRect;
    toTElement: typeof toTElementType;
  },
) {
  const originalText = node.text();
  const containerId = deps.getContainerId(node);
  const isAttached = containerId !== null;
  const attachedRect = isAttached && containerId ? deps.findAttachedContainerRect(context, containerId) : null;
  const originalRectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
  const originalRectWidth = attachedRect?.width() ?? null;
  const originalRectHeight = attachedRect?.height() ?? null;
  const originalTextElement = deps.toTElement(node);
  context.setState('editingTextId', node.id());
  node.visible(false);
  context.stage.batchDraw();

  const textarea = document.createElement('textarea');
  const absPos = node.getAbsolutePosition();
  const absScale = node.getAbsoluteScale();
  const absRot = node.getAbsoluteRotation();
  const scaledFontSize = node.fontSize() * absScale.x;
  const scaledWidth = Math.max(node.width() * absScale.x, 4);
  const scaledHeight = Math.max(node.height() * absScale.y, scaledFontSize);

  const getMinScreenHeight = (text: string) => {
    return Math.max(deps.computeTextHeight(node, text) * absScale.y, scaledFontSize);
  };
  const getMinScreenWidth = (text: string) => {
    return Math.max(deps.computeTextWidth(node, text) * absScale.x, 4);
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
    lineHeight: String(node.lineHeight()),
    transform: `rotate(${absRot}deg)`,
    transformOrigin: 'top left',
    whiteSpace: isAttached ? 'pre-wrap' : 'pre',
    wordBreak: isAttached ? 'break-word' : 'normal',
    outline: '2px solid #3b82f6',
    background: 'transparent',
    border: 'none',
    resize: 'none',
    overflow: 'hidden',
    padding: '0',
    boxSizing: 'border-box',
    zIndex: '9999',
    color: '#000000',
  });

  const autoGrow = () => {
    if (isAttached) {
      textarea.style.width = scaledWidth + 'px';
    } else {
      textarea.style.width = 'auto';
      textarea.style.width = Math.max(textarea.scrollWidth, getMinScreenWidth(textarea.value)) + 'px';
    }
    textarea.style.height = 'auto';
    textarea.style.height = (
      isAttached
        ? Math.max(scaledHeight, textarea.scrollHeight)
        : Math.max(textarea.scrollHeight, getMinScreenHeight(textarea.value))
    ) + 'px';
  };
  textarea.addEventListener('input', autoGrow);

  context.stage.container().appendChild(textarea);
  autoGrow();
  textarea.focus();
  textarea.select();

  const stopTextareaKeyPropagation = (e: KeyboardEvent) => {
    e.stopPropagation();
  };

  const commit = () => {
    const newText = textarea.value;
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

    const textToSet = (!isNew && newText === '') ? originalText : newText;
    node.text(textToSet);
    if (isAttached && attachedRect && originalRectWidth !== null && originalRectHeight !== null) {
      attachedRect.width(originalRectWidth);
      attachedRect.height(Math.max(originalRectHeight, worldHeightFromTextarea));
      deps.syncAttachedTextToRect(attachedRect, node);
    } else {
      node.width(Math.max(worldWidthFromTextarea, deps.computeTextWidth(node, textToSet)));
      node.height(Math.max(worldHeightFromTextarea, deps.computeTextHeight(node, textToSet)));
    }
    node.visible(true);
    context.stage.batchDraw();

    const textElement = deps.toTElement(node);
    const rectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
    context.crdt.patch({ elements: [rectElement, textElement].filter(Boolean) as TElement[], groups: [] });

    if (textToSet !== originalText) {
      const afterRectElement = attachedRect ? context.capabilities.toElement?.(attachedRect) : null;
      const afterTextElement = deps.toTElement(node);
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

  return { cancel, commit, textarea };
}
