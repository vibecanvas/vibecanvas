import { oc } from "@orpc/contract";
import { z } from "zod";

const fileFormatSchema = z.union([
  z.literal("image/jpeg"),
  z.literal("image/png"),
  z.literal("image/gif"),
  z.literal("image/webp"),
]);

const putFileInputSchema = z.object({
  body: z.object({
    base64: z.string(),
    format: fileFormatSchema,
  }),
});

const putFileOutputSchema = z.object({
  url: z.string(),
});

export type TPutFileInput = z.infer<typeof putFileInputSchema>;
export type TPutFileOutput = z.infer<typeof putFileOutputSchema>;
export type TFileFormat = z.infer<typeof fileFormatSchema>;


const dirChildSchema = z.object({
  name: z.string(),
  path: z.string(),
  isDir: z.boolean(),
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
    .input(z.object({ query: z.object({ path: z.string(), omitFiles: z.boolean().optional() }) }))
    .output(z.union([dirListSchema, projectDirErrorSchema])),

  files: oc
    .input(z.object({ query: z.object({ path: z.string(), glob_pattern: z.string().optional(), max_depth: z.number().optional() }) }))
    .output(z.union([dirFilesSchema, projectDirErrorSchema])),

  put: oc
    .input(putFileInputSchema)
    .output(putFileOutputSchema),
});
