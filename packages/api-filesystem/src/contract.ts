import { eventIterator, oc } from '@orpc/contract';
import { z } from 'zod';

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

const moveFileInputSchema = z.object({
  body: z.object({
    source_path: z.string(),
    destination_dir_path: z.string(),
  }),
});

const moveFileOutputSchema = z.object({
  source_path: z.string(),
  destination_dir_path: z.string(),
  target_path: z.string(),
  moved: z.boolean(),
});

const projectDirErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
});

const fileKindSchema = z.enum(['pdf', 'text', 'image', 'binary', 'video']);

const contentTypeSchema = z.enum(['text', 'base64', 'binary', 'none']);

const inspectOutputSchema = z.object({
  name: z.string(),
  path: z.string(),
  mime: z.string().nullable(),
  kind: fileKindSchema,
  size: z.number(),
  lastModified: z.number(),
  permissions: z.string(),
});

const readOutputSchema = z.union([
  z.object({
    kind: z.literal('text'),
    content: z.string(),
    truncated: z.boolean(),
  }),
  z.object({
    kind: z.literal('binary'),
    content: z.string().nullable(),
    size: z.number(),
    mime: z.string().optional(),
    encoding: z.enum(['base64', 'hex']).optional(),
  }),
  z.object({
    kind: z.literal('none'),
    size: z.number(),
  }),
  projectDirErrorSchema,
]);

const writeOutputSchema = z.union([
  z.object({
    success: z.literal(true),
  }),
  projectDirErrorSchema,
]);

const watchEventSchema = z.object({
  eventType: z.enum(['rename', 'change']),
  fileName: z.string(),
});

type TDirChild = z.infer<typeof dirChildSchema>;
type TDirHomeResponse = z.infer<typeof dirHomeSchema>;
type TDirListResponse = z.infer<typeof dirListSchema>;
type TDirFilesResponse = z.infer<typeof dirFilesSchema>;
type TMoveFileInput = z.infer<typeof moveFileInputSchema>;
type TMoveFileOutput = z.infer<typeof moveFileOutputSchema>;
type TFileKind = z.infer<typeof fileKindSchema>;
type TContentType = z.infer<typeof contentTypeSchema>;
type TInspectOutput = z.infer<typeof inspectOutputSchema>;
type TReadOutput = z.infer<typeof readOutputSchema>;
type TWriteOutput = z.infer<typeof writeOutputSchema>;
type TWatchEvent = z.infer<typeof watchEventSchema>;

const filesystemContract = oc.router({
  home: oc
    .output(z.union([dirHomeSchema, projectDirErrorSchema])),

  list: oc
    .input(z.object({ query: z.object({ path: z.string(), omitFiles: z.boolean().optional() }) }))
    .output(z.union([dirListSchema, projectDirErrorSchema])),

  files: oc
    .input(z.object({ query: z.object({ path: z.string(), glob_pattern: z.string().optional(), max_depth: z.number().optional() }) }))
    .output(z.union([dirFilesSchema, projectDirErrorSchema])),

  move: oc
    .input(moveFileInputSchema)
    .output(z.union([moveFileOutputSchema, projectDirErrorSchema])),

  inspect: oc
    .input(z.object({ query: z.object({ path: z.string() }) }))
    .output(z.union([inspectOutputSchema, projectDirErrorSchema])),

  read: oc
    .input(z.object({ query: z.object({ path: z.string(), maxBytes: z.number().optional(), content: z.enum(['text', 'base64', 'binary', 'none']).optional() }) }))
    .output(readOutputSchema),

  write: oc
    .input(z.object({ query: z.object({ path: z.string(), content: z.string() }) }))
    .output(writeOutputSchema),

  watch: oc
    .input(z.object({ path: z.string(), watchId: z.string() }))
    .output(eventIterator(watchEventSchema)),

  keepaliveWatch: oc
    .input(z.object({ watchId: z.string() }))
    .output(z.boolean()),

  unwatch: oc
    .input(z.object({ watchId: z.string() })),
});

export {
  contentTypeSchema,
  dirChildSchema,
  dirFilesSchema,
  dirHomeSchema,
  dirListSchema,
  filesystemContract,
  fileKindSchema,
  inspectOutputSchema,
  moveFileInputSchema,
  moveFileOutputSchema,
  projectDirErrorSchema,
  readOutputSchema,
  watchEventSchema,
  writeOutputSchema,
};
export type {
  TContentType,
  TDirChild,
  TDirFilesResponse,
  TDirHomeResponse,
  TDirListResponse,
  TDirNode,
  TFileKind,
  TInspectOutput,
  TMoveFileInput,
  TMoveFileOutput,
  TReadOutput,
  TWatchEvent,
  TWriteOutput,
};
export default filesystemContract;
