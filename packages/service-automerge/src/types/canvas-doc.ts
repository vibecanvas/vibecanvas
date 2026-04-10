import type { TCanvasDoc, TElement, TDrawingType, TWidgetType } from './canvas-doc.types';

export type * from './canvas-doc.types';
export * from './canvas-doc.zod';

const DRAWING_TYPES: TDrawingType[] = ['rect', 'ellipse', 'diamond', 'arrow', 'line', 'pen', 'text', 'image'];
const WIDGET_TYPES: TWidgetType[] = ['filetree', 'terminal', 'file', 'iframe-browser'];

export function isDrawing(element: TElement): boolean {
  return DRAWING_TYPES.includes(element.data.type as TDrawingType);
}

export function isWidget(element: TElement): boolean {
  return WIDGET_TYPES.includes(element.data.type as TWidgetType);
}

export function getElementsSortedByZ(doc: TCanvasDoc): TElement[] {
  return Object.values(doc.elements).sort((a, b) => a.zIndex.localeCompare(b.zIndex));
}
