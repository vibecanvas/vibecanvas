import Konva from "konva";
import type { IPluginContext } from "../shared/interface";

export function getContainerId(node: Konva.Node): string | null {
  const containerId = node.getAttr('vcContainerId');
  return typeof containerId === 'string' ? containerId : null;
}

export function isAttachedTextNode(node: Konva.Node): node is Konva.Text {
  return node instanceof Konva.Text && getContainerId(node) !== null;
}

export function findAttachedTextByContainerId(context: IPluginContext, containerId: string): Konva.Text | null {
  const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof Konva.Text && getContainerId(candidate) === containerId;
  });

  return node instanceof Konva.Text ? node : null;
}

export function findAttachedContainerRect(context: IPluginContext, containerId: string): Konva.Rect | null {
  const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof Konva.Rect && candidate.id() === containerId;
  });

  return node instanceof Konva.Rect ? node : null;
}

export function getAttachedTextPadding(rect: Konva.Rect): number {
  return Math.min(16, Math.max(8, Math.min(rect.width(), rect.height()) * 0.12));
}

export function syncAttachedTextToRect(rect: Konva.Rect, node: Konva.Text) {
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
    padding: getAttachedTextPadding(rect),
    scaleX: rect.scaleX(),
    scaleY: rect.scaleY(),
  });
}

export function computeTextWidth(node: Konva.Text, text: string): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return Math.max(node.width(), 4);

  context.font = `${node.fontSize()}px ${node.fontFamily()}`;
  const maxLineWidth = text.split('\n').reduce((max, line) => {
    return Math.max(max, context.measureText(line).width);
  }, 0);

  return Math.ceil(maxLineWidth) + node.padding() * 2;
}

/**
 * Compute text height robustly.
 * Uses explicit newline count as a floor so hidden-node stale measurement
 * cannot shrink the result below the number of actual lines.
 */
export function computeTextHeight(node: Konva.Text, text: string): number {
  const lineCount = (text.match(/\n/g)?.length ?? 0) + 1;
  return Math.ceil(lineCount * node.fontSize() * node.lineHeight()) + node.padding() * 2;
}
