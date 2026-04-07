import { oc } from '@orpc/contract';
import { ZCanvasSelect, ZFileTreeSelect } from '@vibecanvas/service-db/schema';
import { z } from 'zod';

const getCanvasByIdResponseSchema = z.object({
  canvas: ZCanvasSelect.array(),
  fileTrees: ZFileTreeSelect.array(),
});

const createCanvasInputSchema = z.object({
  name: z.string(),
});

const updateCanvasInputSchema = z.object({
  name: z.string().optional(),
});

const canvasContract = oc.router({
  list: oc.output(ZCanvasSelect.array()),

  get: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(getCanvasByIdResponseSchema),

  create: oc
    .input(createCanvasInputSchema)
    .output(ZCanvasSelect),

  update: oc
    .input(z.object({ params: z.object({ id: z.string() }), body: updateCanvasInputSchema }))
    .output(ZCanvasSelect),

  remove: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(ZCanvasSelect),
});

export { canvasContract };
