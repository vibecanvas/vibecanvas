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

const cloneFileInputSchema = z.object({
  body: z.object({
    url: z.string(),
  }),
});

const cloneFileOutputSchema = z.object({
  url: z.string(),
});

const removeFileInputSchema = z.object({
  body: z.object({
    url: z.string(),
  }),
});

const removeFileOutputSchema = z.object({
  ok: z.literal(true),
});

export type TPutFileInput = z.infer<typeof putFileInputSchema>;
export type TPutFileOutput = z.infer<typeof putFileOutputSchema>;
export type TCloneFileInput = z.infer<typeof cloneFileInputSchema>;
export type TCloneFileOutput = z.infer<typeof cloneFileOutputSchema>;
export type TRemoveFileInput = z.infer<typeof removeFileInputSchema>;
export type TRemoveFileOutput = z.infer<typeof removeFileOutputSchema>;
export type TFileFormat = z.infer<typeof fileFormatSchema>;

export default oc.router({
  put: oc
    .input(putFileInputSchema)
    .output(putFileOutputSchema),
  clone: oc
    .input(cloneFileInputSchema)
    .output(cloneFileOutputSchema),
  remove: oc
    .input(removeFileInputSchema)
    .output(removeFileOutputSchema),
});
