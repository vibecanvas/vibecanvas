import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasRow } from './context';
import { normalizeCanvas } from './context';
import { toCanvasCmdError, throwCanvasCmdError, type TCanvasCmdErrorDetails } from './errors';
import { createSceneTargets, matchesSceneSelector, type TSceneSelectorEnvelope, validateGroupSelector } from './scene-query-shared';
import { buildMatchMetadata, buildTargetPayload, resolveCanvasSelection, resolveOutputMode, type TSceneBounds, type TSceneMatchMetadata, type TSceneOutputMode, type TSceneTarget } from './scene-shared';

export type TQueryMatch = {
  metadata: TSceneMatchMetadata;
  payload: Record<string, unknown>;
};

export type TCanvasQuerySuccess = {
  ok: true;
  command: 'canvas.query';
  mode: TSceneOutputMode;
  selector: TSceneSelectorEnvelope;
  canvas: ReturnType<typeof normalizeCanvas>;
  count: number;
  matches: TQueryMatch[];
};

export type TCanvasQueryInput = {
  selector: TSceneSelectorEnvelope;
  output?: string;
  omitData?: boolean;
  omitStyle?: boolean;
};

type TQueryOutputOptions = {
  omitData: boolean;
  omitStyle: boolean;
};

function exitQueryError(error: TCanvasCmdErrorDetails): never {
  throwCanvasCmdError(error);
}

function buildQueryPayload(target: TSceneTarget, doc: TCanvasDoc, mode: TSceneOutputMode, options: TQueryOutputOptions): Record<string, unknown> {
  const payload = buildTargetPayload(target, doc, mode);
  if (target.kind === 'element') {
    return {
      ...payload,
      ...(options.omitData ? {} : { data: structuredClone(target.element.data) }),
      ...(options.omitStyle ? {} : { style: structuredClone(target.element.style) }),
    };
  }

  return {
    ...payload,
    ...(options.omitData ? {} : { data: null }),
    ...(options.omitStyle ? {} : { style: null }),
  };
}

export async function executeCanvasQuery(ctx: TCanvasCmdContext, input: TCanvasQueryInput): Promise<TCanvasQuerySuccess> {
  const wantsSelector = input.selector;
  const canvasId = wantsSelector.canvasId;
  const canvasNameQuery = wantsSelector.canvasNameQuery;
  const outputOptions: TQueryOutputOptions = {
    omitData: Boolean(input.omitData),
    omitStyle: Boolean(input.omitStyle),
  };

  const outputMode = resolveOutputMode({
    output: input.output,
    command: 'canvas.query',
    fail: (error) => exitQueryError(error),
  });

  try {
    const rows = await ctx.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.query',
      actionLabel: 'Query',
      fail: (error) => exitQueryError(error),
    });
    const resolvedHandle = await ctx.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) {
      throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    }

    const doc = structuredClone(currentDoc);
    validateGroupSelector({
      doc,
      selector: wantsSelector.filters,
      command: 'canvas.query',
      canvasId: selectedCanvas.id,
      canvasNameQuery,
      canvasName: selectedCanvas.name,
      fail: (error) => exitQueryError(error),
    });

    const matches = createSceneTargets(doc)
      .filter((target) => matchesSceneSelector(target, doc, wantsSelector.filters))
      .map((target) => ({
        metadata: buildMatchMetadata(target, doc),
        payload: buildQueryPayload(target, doc, outputMode, outputOptions),
      } satisfies TQueryMatch));

    return {
      ok: true,
      command: 'canvas.query',
      mode: outputMode,
      selector: wantsSelector,
      canvas: normalizeCanvas(selectedCanvas),
      count: matches.length,
      matches,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'CanvasCmdError') throw error;
    throw toCanvasCmdError({
      command: 'canvas.query',
      code: 'CANVAS_QUERY_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}

export function formatBounds(bounds: TSceneBounds | null): string {
  if (!bounds) return 'null';
  return `(${bounds.x}, ${bounds.y}, ${bounds.w}, ${bounds.h})`;
}
