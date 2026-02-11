import { oc } from "@orpc/contract";
import { ZFileTreeSelect } from "@vibecanvas/shell/database/schema";
import type * as _DrizzleZod from "drizzle-zod";
import { z } from "zod";

const createFiletreeInputSchema = z.object({
  canvas_id: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  is_collapsed: z.boolean().optional(),
  glob_pattern: z.string().optional(),
});

const updateFiletreeBodySchema = z.object({
  title: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  is_collapsed: z.boolean().optional(),
  glob_pattern: z.string().nullable().optional(),
  group_ids: z.array(z.string()).optional(),
  bound_ids: z.array(z.string()).optional(),
});

export default oc.router({
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
