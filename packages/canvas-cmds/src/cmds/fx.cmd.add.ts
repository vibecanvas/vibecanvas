import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TArrowData, TCanvasDoc, TDiamondData, TEllipseData, TElement, TElementData, TElementStyle, TLineData, TRectData, TTextData } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { fnNormalizeCanvas, fnResolveCanvasSelection, fnSortIds, type TCanvasSummary } from '../core/fn.canvas';
import { fnIsPlainObject } from '../core/fn.guard';
import { fxLoadCanvasHandleDoc } from '../core/fx.canvas';
import type { TCanvasCmdErrorDetails } from '../types';

export type TAddPrimitiveType = 'rect' | 'ellipse' | 'diamond' | 'text' | 'line' | 'arrow';

export type TCanvasAddElementInput = {
  id?: string;
  type: TAddPrimitiveType;
  x?: number;
  y?: number;
  rotation?: number;
  parentGroupId?: string | null;
  locked?: boolean;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
};

export type TCanvasAddInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  elements: TCanvasAddElementInput[];
};

export type TCanvasAddSuccess = {
  ok: true;
  command: 'canvas.add';
  canvas: TCanvasSummary;
  addedCount: number;
  addedIds: string[];
  elements: Array<{ id: string; type: TAddPrimitiveType; parentGroupId: string | null; zIndex: string }>;
};

export type TPortal = {
  dbService: IDbService;
  automergeService: IAutomergeService;
};

function fnCreateOrderedZIndex(index: number): string {
  return `z${String(index).padStart(8, '0')}`;
}

function fnExtractZIndexNumber(zIndex: string): number {
  const match = /^z(\d+)$/.exec(zIndex);
  return match ? Number(match[1]) : -1;
}

function fnValidateInput(input: TCanvasAddInput): TCanvasAddElementInput[] {
  if (input.elements.length === 0) throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_ELEMENT_REQUIRED', message: 'Add requires at least one element payload.', canvasId: input.canvasId, canvasNameQuery: input.canvasNameQuery } satisfies TCanvasCmdErrorDetails;
  return input.elements;
}

function fnDefaultStyle(): TElementStyle {
  return { backgroundColor: '#ffffff', strokeColor: '#111111', strokeWidth: 1, opacity: 1 };
}

function fnBuildData(type: TAddPrimitiveType, raw: Record<string, unknown>): TElementData {
  if (type === 'rect') return { type: 'rect', w: 120, h: 80, ...(raw as Partial<TRectData>) };
  if (type === 'ellipse') return { type: 'ellipse', rx: 60, ry: 40, ...(raw as Partial<TEllipseData>) };
  if (type === 'diamond') return { type: 'diamond', w: 120, h: 80, ...(raw as Partial<TDiamondData>) };
  if (type === 'text') return { type: 'text', w: 120, h: 40, text: 'hello', originalText: 'hello', fontSize: 16, fontFamily: 'Inter', textAlign: 'left', verticalAlign: 'top', lineHeight: 1.2, link: null, containerId: null, autoResize: false, ...(raw as Partial<TTextData>) };
  if (type === 'line') return { type: 'line', lineType: 'straight', points: [[0, 0], [120, 0]], startBinding: null, endBinding: null, ...(raw as Partial<TLineData>) };
  return { type: 'arrow', lineType: 'straight', points: [[0, 0], [120, 0]], startBinding: null, endBinding: null, startCap: 'none', endCap: 'arrow', ...(raw as Partial<TArrowData>) };
}

function fnValidateElementPayload(element: TCanvasAddElementInput, doc: TCanvasDoc): void {
  if (!['rect', 'ellipse', 'diamond', 'text', 'line', 'arrow'].includes(element.type)) {
    throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_TYPE_INVALID', message: `Unsupported element type '${String(element.type)}'.` } satisfies TCanvasCmdErrorDetails;
  }
  if (element.data !== undefined && !fnIsPlainObject(element.data)) throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_PAYLOAD_INVALID', message: 'Element data must be an object.' } satisfies TCanvasCmdErrorDetails;
  if (element.style !== undefined && !fnIsPlainObject(element.style)) throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_PAYLOAD_INVALID', message: 'Element style must be an object.' } satisfies TCanvasCmdErrorDetails;
  if (element.parentGroupId !== undefined && element.parentGroupId !== null && !doc.groups[element.parentGroupId]) {
    throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_PARENT_GROUP_NOT_FOUND', message: `Parent group '${element.parentGroupId}' was not found.` } satisfies TCanvasCmdErrorDetails;
  }
  if (element.id && (doc.elements[element.id] || doc.groups[element.id])) {
    throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_ID_CONFLICT', message: `Element id '${element.id}' already exists.` } satisfies TCanvasCmdErrorDetails;
  }
}

function fnBuildElement(args: { input: TCanvasAddElementInput; zIndex: string }): TElement {
  const now = Date.now();
  return {
    id: args.input.id ?? crypto.randomUUID(),
    x: args.input.x ?? 0,
    y: args.input.y ?? 0,
    rotation: args.input.rotation ?? 0,
    zIndex: args.zIndex,
    parentGroupId: args.input.parentGroupId ?? null,
    bindings: [],
    locked: args.input.locked ?? false,
    createdAt: now,
    updatedAt: now,
    data: fnBuildData(args.input.type, args.input.data ?? {}),
    style: { ...fnDefaultStyle(), ...(args.input.style ?? {}) },
  };
}

export async function fxExecuteCanvasAdd(portal: TPortal, input: TCanvasAddInput): Promise<TCanvasAddSuccess> {
  try {
    const requestedElements = fnValidateInput(input);
    const selectedCanvas = fnResolveCanvasSelection({ rows: portal.dbService.canvas.listAll(), selector: input, command: 'canvas.add', actionLabel: 'Add' });
    const { handle, doc } = await fxLoadCanvasHandleDoc(portal, selectedCanvas);

    for (const element of requestedElements) fnValidateElementPayload(element, doc);

    const maxExistingIndex = Math.max(-1, ...Object.values(doc.elements).map((element) => fnExtractZIndexNumber(element.zIndex)), ...Object.values(doc.groups).map((group) => fnExtractZIndexNumber(group.zIndex)));
    const builtElements = requestedElements.map((element, index) => fnBuildElement({ input: element, zIndex: fnCreateOrderedZIndex(maxExistingIndex + index + 1) }));
    const builtIds = new Set<string>();
    for (const element of builtElements) {
      if (builtIds.has(element.id)) throw { ok: false, command: 'canvas.add', code: 'CANVAS_ADD_ID_CONFLICT', message: `Element id '${element.id}' already exists.` } satisfies TCanvasCmdErrorDetails;
      builtIds.add(element.id);
    }

    handle.change((nextDoc) => {
      for (const element of builtElements) nextDoc.elements[element.id] = structuredClone(element);
    });

    return {
      ok: true,
      command: 'canvas.add',
      canvas: fnNormalizeCanvas(selectedCanvas),
      addedCount: builtElements.length,
      addedIds: fnSortIds(builtElements.map((element) => element.id)),
      elements: builtElements.map((element) => ({ id: element.id, type: element.data.type as TAddPrimitiveType, parentGroupId: element.parentGroupId, zIndex: element.zIndex })),
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'ok' in error && 'code' in error) throw error;
    throw {
      ok: false,
      command: 'canvas.add',
      code: 'CANVAS_ADD_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    } satisfies TCanvasCmdErrorDetails;
  }
}
