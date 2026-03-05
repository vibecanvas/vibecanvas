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

export default oc.router({
  put: oc
    .input(putFileInputSchema)
    .output(putFileOutputSchema),
});
