import { oc } from '@orpc/contract';
import { z } from 'zod';

const ptySizeSchema = z.object({
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
});

const ptyCreateBodySchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  title: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  size: ptySizeSchema.optional(),
});

const ptyUpdateBodySchema = z.object({
  title: z.string().optional(),
  size: ptySizeSchema.optional(),
});

const zPty = z.object({
  id: z.string(),
  title: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  status: z.string(),
  pid: z.number().int(),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  exitCode: z.number().int().nullable(),
  signalCode: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const ptyScopedInputSchema = z.object({
  workingDirectory: z.string(),
});

const ptyCreateInputSchema = z.object({
  workingDirectory: z.string(),
  body: ptyCreateBodySchema.optional(),
});

const ptyPathInputSchema = z.object({
  workingDirectory: z.string(),
  path: z.object({
    ptyID: z.string(),
  }),
});

const ptyUpdateInputSchema = z.object({
  workingDirectory: z.string(),
  path: z.object({
    ptyID: z.string(),
  }),
  body: ptyUpdateBodySchema,
});

type TPty = z.infer<typeof zPty>;
type TPtyCreateBodySchema = z.infer<typeof ptyCreateBodySchema>;
type TPtyUpdateBodySchema = z.infer<typeof ptyUpdateBodySchema>;
type TPtyCreateInput = z.infer<typeof ptyCreateInputSchema>;
type TPtyPathInput = z.infer<typeof ptyPathInputSchema>;
type TPtyScopedInput = z.infer<typeof ptyScopedInputSchema>;
type TPtyUpdateInput = z.infer<typeof ptyUpdateInputSchema>;

const ptyContract = oc.router({
  list: oc
    .input(ptyScopedInputSchema)
    .output(z.array(zPty)),

  create: oc
    .input(ptyCreateInputSchema)
    .output(zPty),

  get: oc
    .input(ptyPathInputSchema)
    .output(zPty.nullable()),

  update: oc
    .input(ptyUpdateInputSchema)
    .output(zPty),

  remove: oc
    .input(ptyPathInputSchema)
    .output(z.boolean()),
});

export {
  ptyContract,
  ptyCreateBodySchema,
  ptyCreateInputSchema,
  ptyPathInputSchema,
  ptyScopedInputSchema,
  ptySizeSchema,
  ptyUpdateBodySchema,
  ptyUpdateInputSchema,
  zPty,
};
export type {
  TPty,
  TPtyCreateBodySchema,
  TPtyCreateInput,
  TPtyPathInput,
  TPtyScopedInput,
  TPtyUpdateBodySchema,
  TPtyUpdateInput,
};
export default ptyContract;
