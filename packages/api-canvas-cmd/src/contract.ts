import { oc, populateContractRouterPaths } from '@orpc/contract';
import { z } from 'zod';

const sceneBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const sceneSelectorScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const sceneStyleFilterSchema = z.record(z.string(), sceneSelectorScalarSchema);

const sceneSelectorSchema = z.object({
  ids: z.string().array(),
  kinds: z.enum(['element', 'group']).array(),
  types: z.string().array(),
  style: sceneStyleFilterSchema,
  group: z.string().nullable(),
  subtree: z.string().nullable(),
  bounds: sceneBoundsSchema.nullable(),
  boundsMode: z.enum(['intersects', 'contains']),
});

const sceneSelectorEnvelopeSchema = z.object({
  source: z.enum(['none', 'flags', 'where', 'query']),
  canvasId: z.string().nullable(),
  canvasNameQuery: z.string().nullable(),
  filters: sceneSelectorSchema,
});

const canvasSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  automergeUrl: z.string(),
  createdAt: z.string(),
});

const canvasCommandListOutputSchema = z.object({
  ok: z.literal(true),
  command: z.literal('canvas'),
  subcommand: z.literal('list'),
  count: z.number().int(),
  canvases: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    automergeUrl: z.string(),
  }).array(),
});

const canvasCommandQueryInputSchema = z.object({
  selector: sceneSelectorEnvelopeSchema,
  output: z.enum(['summary', 'focused', 'full']).optional(),
  omitData: z.boolean().optional(),
  omitStyle: z.boolean().optional(),
});

const canvasCommandQueryOutputSchema = z.object({
  ok: z.literal(true),
  command: z.literal('canvas.query'),
  mode: z.enum(['summary', 'focused', 'full']),
  selector: sceneSelectorEnvelopeSchema,
  canvas: canvasSummarySchema,
  count: z.number().int(),
  matches: z.object({
    metadata: z.object({
      kind: z.enum(['element', 'group']),
      id: z.string(),
      type: z.string().nullable(),
      parentGroupId: z.string().nullable(),
      zIndex: z.string(),
      locked: z.boolean(),
      bounds: sceneBoundsSchema.nullable(),
    }),
    payload: z.record(z.string(), z.any()),
  }).array(),
});

const canvasCommandMoveInputSchema = z.object({
  canvasId: z.string().nullable(),
  canvasNameQuery: z.string().nullable(),
  ids: z.string().array(),
  mode: z.enum(['relative', 'absolute']),
  x: z.number(),
  y: z.number(),
});

const canvasCommandMoveOutputSchema = z.object({
  ok: z.literal(true),
  command: z.literal('canvas.move'),
  mode: z.enum(['relative', 'absolute']),
  input: z.object({ x: z.number(), y: z.number() }),
  delta: z.object({ dx: z.number(), dy: z.number() }),
  canvas: canvasSummarySchema,
  matchedCount: z.number().int(),
  matchedIds: z.string().array(),
  changedCount: z.number().int(),
  changedIds: z.string().array(),
});

const canvasCommandElementPatchSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  zIndex: z.string().optional(),
  parentGroupId: z.string().nullable().optional(),
  locked: z.boolean().optional(),
  data: z.record(z.string(), z.any()).optional(),
  style: z.record(z.string(), z.any()).optional(),
}).strict();

const canvasCommandGroupPatchSchema = z.object({
  parentGroupId: z.string().nullable().optional(),
  zIndex: z.string().optional(),
  locked: z.boolean().optional(),
}).strict();

const canvasCommandPatchEnvelopeSchema = z.object({
  element: canvasCommandElementPatchSchema.optional(),
  group: canvasCommandGroupPatchSchema.optional(),
}).strict();

const canvasCommandPatchInputSchema = z.object({
  canvasId: z.string().nullable(),
  canvasNameQuery: z.string().nullable(),
  ids: z.string().array(),
  patch: canvasCommandPatchEnvelopeSchema,
});

const canvasCommandPatchOutputSchema = z.object({
  ok: z.literal(true),
  command: z.literal('canvas.patch'),
  patch: canvasCommandPatchEnvelopeSchema,
  canvas: canvasSummarySchema,
  matchedCount: z.number().int(),
  matchedIds: z.string().array(),
  changedCount: z.number().int(),
  changedIds: z.string().array(),
});

const canvasCmdContract = oc.router({
  list: oc.output(canvasCommandListOutputSchema),
  query: oc.input(canvasCommandQueryInputSchema).output(canvasCommandQueryOutputSchema),
  move: oc.input(canvasCommandMoveInputSchema).output(canvasCommandMoveOutputSchema),
  patch: oc.input(canvasCommandPatchInputSchema).output(canvasCommandPatchOutputSchema),
});

const canvasCmdApiContract = populateContractRouterPaths(
  oc.router({ api: oc.router({ canvasCmd: canvasCmdContract }) }),
);

export { canvasCmdContract, canvasCmdApiContract };
