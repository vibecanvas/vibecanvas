import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod";

// ── Directory schemas (extracted from file.contract.ts) ──────────────────────

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

// ── File inspect / read schemas (new) ────────────────────────────────────────

const fileKindSchema = z.enum(["pdf", "text", "image", "binary", "video"]);

const contentTypeSchema = z.enum(["text", "base64", "binary", "none"]);

const inspectOutputSchema = z.object({
  name: z.string(),
  path: z.string(),
  mime: z.string().nullable(),
  kind: fileKindSchema,
  size: z.number(),
  lastModified: z.number(),
});

const readOutputSchema = z.union([
  z.object({
    kind: z.literal("text"),
    content: z.string(),
    truncated: z.boolean(),
  }),
  z.object({
    kind: z.literal("binary"),
    content: z.string().nullable(),
    size: z.number(),
  }),
  z.object({
    kind: z.literal("none"),
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
  eventType: z.enum(["rename", "change"]),
  fileName: z.string(),
});

// ── Exported types ───────────────────────────────────────────────────────────

export type TDirChild = z.infer<typeof dirChildSchema>;
export type TDirHomeResponse = z.infer<typeof dirHomeSchema>;
export type TDirListResponse = z.infer<typeof dirListSchema>;
export type { TDirNode };
export type TDirFilesResponse = z.infer<typeof dirFilesSchema>;
export type TMoveFileInput = z.infer<typeof moveFileInputSchema>;
export type TMoveFileOutput = z.infer<typeof moveFileOutputSchema>;
export type TFileKind = z.infer<typeof fileKindSchema>;
export type TContentType = z.infer<typeof contentTypeSchema>;
export type TInspectOutput = z.infer<typeof inspectOutputSchema>;
export type TReadOutput = z.infer<typeof readOutputSchema>;
export type TWriteOutput = z.infer<typeof writeOutputSchema>;

// ── Contract router ──────────────────────────────────────────────────────────

export default oc.router({
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
    .input(z.object({ query: z.object({ path: z.string(), maxBytes: z.number().optional(), content: contentTypeSchema.optional() }) }))
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
    .input(z.object({ watchId: z.string() }))
});
