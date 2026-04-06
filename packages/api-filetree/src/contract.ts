import { oc } from '@orpc/contract';
import { ZFileTreeSelect } from '@vibecanvas/db/schema';
import { z } from 'zod';

const createFiletreeInputSchema = z.object({
  canvas_id: z.string(),
  path: z.string().optional(),
  x: z.number(),
  y: z.number(),
});

const updateFiletreeBodySchema = z.object({
  title: z.string().optional(),
  path: z.string().optional(),
  locked: z.boolean().optional(),
});

const filetreeContract = oc.router({
  create: oc
    .input(createFiletreeInputSchema)
    .output(ZFileTreeSelect),

  update: oc
    .input(z.object({ params: z.object({ id: z.string() }), body: updateFiletreeBodySchema }))
    .output(ZFileTreeSelect),

  remove: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(z.void()),
});

export { filetreeContract };
