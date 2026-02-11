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

const projectDirErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
});

export type TDirChild = z.infer<typeof dirChildSchema>;
export type TDirHomeResponse = z.infer<typeof dirHomeSchema>;
export type TDirListResponse = z.infer<typeof dirListSchema>;

export default oc.router({
  home: oc
    .output(z.union([dirHomeSchema, projectDirErrorSchema])),

  list: oc
    .input(z.object({ query: z.object({ path: z.string() }) }))
    .output(z.union([dirListSchema, projectDirErrorSchema])),
});
