import { oc } from "@orpc/contract";
import { z } from "zod";

const dirChildSchema = z.object({
  name: z.string(),
  path: z.string(),
});

const dirHomeSchema = z.object({
  path: z.string(),
});

const dirListSchema = z.object({
  current: z.string(),
  parent: z.string().nullable(),
  children: z.array(dirChildSchema),
});

const baseDirNodeSchema = z.object({
  name: z.string(),
  path: z.string(),
  is_dir: z.boolean(),
});

type TDirNode = z.infer<typeof baseDirNodeSchema> & {
  children: TDirNode[];
};

const dirNodeSchema: z.ZodType<TDirNode> = baseDirNodeSchema.extend({
  children: z.lazy(() => z.array(dirNodeSchema)),
});

const dirFilesSchema = z.object({
  root: z.string(),
  children: z.array(dirNodeSchema),
});

const projectDirErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
});

export type TDirChild = z.infer<typeof dirChildSchema>;
export type TDirHomeResponse = z.infer<typeof dirHomeSchema>;
export type TDirListResponse = z.infer<typeof dirListSchema>;
export type { TDirNode };
export type TDirFilesResponse = z.infer<typeof dirFilesSchema>;

export default oc.router({
  home: oc
    .output(z.union([dirHomeSchema, projectDirErrorSchema])),

  list: oc
    .input(z.object({ query: z.object({ path: z.string() }) }))
    .output(z.union([dirListSchema, projectDirErrorSchema])),

  files: oc
    .input(z.object({ query: z.object({ path: z.string(), glob_pattern: z.string().optional(), max_depth: z.number().optional() }) }))
    .output(z.union([dirFilesSchema, projectDirErrorSchema])),
});
