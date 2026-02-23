import { oc } from "@orpc/contract";
import { z } from "zod";

const positionSchema = z.object({
  line: z.number(),
  character: z.number(),
});

const rangeSchema = z.object({
  start: positionSchema,
  end: positionSchema,
});

const filePartSourceTextSchema = z.object({
  value: z.string(),
  start: z.number(),
  end: z.number(),
});

const filePartSourceSchema = z.discriminatedUnion("type", [
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal("file"),
    path: z.string(),
  }),
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal("symbol"),
    path: z.string(),
    range: rangeSchema,
    name: z.string(),
    kind: z.number(),
  }),
]);

const modelSchema = z.object({
  id: z.string(),
  providerID: z.string(),
  api: z.object({
    id: z.string(),
    url: z.string(),
    npm: z.string(),
  }),
  name: z.string(),
  capabilities: z.object({
    temperature: z.boolean(),
    reasoning: z.boolean(),
    attachment: z.boolean(),
    toolcall: z.boolean(),
    input: z.object({
      text: z.boolean(),
      audio: z.boolean(),
      image: z.boolean(),
      video: z.boolean(),
      pdf: z.boolean(),
    }),
    output: z.object({
      text: z.boolean(),
      audio: z.boolean(),
      image: z.boolean(),
      video: z.boolean(),
      pdf: z.boolean(),
    }),
  }),
  cost: z.object({
    input: z.number(),
    output: z.number(),
    cache: z.object({
      read: z.number(),
      write: z.number(),
    }),
    experimentalOver200K: z
      .object({
        input: z.number(),
        output: z.number(),
        cache: z.object({
          read: z.number(),
          write: z.number(),
        }),
      })
      .optional(),
  }),
  limit: z.object({
    context: z.number(),
    output: z.number(),
  }),
  status: z.enum(["alpha", "beta", "deprecated", "active"]),
  options: z.record(z.string(), z.unknown()),
  headers: z.record(z.string(), z.string()),
});

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["env", "config", "custom", "api"]),
  env: z.array(z.string()),
  key: z.string().optional(),
  options: z.record(z.string(), z.unknown()),
  models: z.record(z.string(), modelSchema),
});

const agentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]),
  builtIn: z.boolean().optional(),
  topP: z.number().optional(),
  temperature: z.number().optional(),
  color: z.string().optional(),
  permission: z.unknown(),
  model: z
    .object({
      modelID: z.string(),
      providerID: z.string(),
    })
    .optional(),
  prompt: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  maxSteps: z.number().optional(),
}).passthrough();

const pathInfoSchema = z.object({
  state: z.string(),
  config: z.string(),
  worktree: z.string(),
  directory: z.string(),
});

const messageErrorSchema = z.object({
  name: z.string(),
  data: z.record(z.string(), z.unknown()),
}).passthrough();

const assistantMessageSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  role: z.literal("assistant"),
  time: z.object({
    created: z.number(),
    completed: z.number().optional(),
  }),
  error: z
    .union([messageErrorSchema, z.null()])
    .optional(),
  parentID: z.string(),
  modelID: z.string(),
  providerID: z.string(),
  mode: z.string(),
  path: z.object({
    cwd: z.string(),
    root: z.string(),
  }),
  summary: z.boolean().optional(),
  cost: z.number(),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    reasoning: z.number(),
    cache: z.object({
      read: z.number(),
      write: z.number(),
    }),
  }),
  finish: z.string().optional(),
}).passthrough();

const partBaseSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  messageID: z.string(),
});

const partSchema = partBaseSchema.extend({
  type: z.string(),
}).passthrough();

const sessionCommandOutputSchema = z.object({
  info: assistantMessageSchema,
  parts: z.array(partSchema),
});

const findTextMatchSchema = z.object({
  path: z.object({ text: z.string() }),
  lines: z.object({ text: z.string() }),
  line_number: z.number(),
  absolute_offset: z.number(),
  submatches: z.array(
    z.object({
      match: z.object({ text: z.string() }),
      start: z.number(),
      end: z.number(),
    }),
  ),
});

const fileContentSchema = z.object({
  type: z.enum(["text", "binary"]),
  content: z.string(),
  diff: z.string().optional(),
  patch: z
    .object({
      oldFileName: z.string(),
      newFileName: z.string(),
      oldHeader: z.string().optional(),
      newHeader: z.string().optional(),
      hunks: z.array(
        z.object({
          oldStart: z.number(),
          oldLines: z.number(),
          newStart: z.number(),
          newLines: z.number(),
          lines: z.array(z.string()),
        }),
      ),
      index: z.string().optional(),
    })
    .optional(),
  encoding: z.literal("base64").optional(),
  mimeType: z.string().optional(),
});

const authSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("oauth"),
    refresh: z.string(),
    access: z.string(),
    expires: z.number(),
    enterpriseUrl: z.string().optional(),
  }),
  z.object({
    type: z.literal("api"),
    key: z.string(),
  }),
  z.object({
    type: z.literal("wellknown"),
    key: z.string(),
    token: z.string(),
  }),
]);

const sessionFilePartInputSchema = z.object({
  id: z.string().optional(),
  type: z.literal("file"),
  mime: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  source: filePartSourceSchema.optional(),
});

const sessionCommandInputSchema = z.object({
  path: z.object({
    id: z.string(),
  }),
  body: z.object({
    messageID: z.string().optional(),
    agent: z.string().optional(),
    model: z.string().optional(),
    arguments: z.string(),
    command: z.string(),
    variant: z.string().optional(),
    parts: z.array(sessionFilePartInputSchema).optional(),
  }),
});

const sessionShellInputSchema = z.object({
  path: z.object({
    id: z.string(),
  }),
  body: z.object({
    command: z.string(),
    agent: z.string().optional(),
    model: z
      .object({
        providerID: z.string(),
        modelID: z.string(),
      })
      .optional(),
  }),
});

const findTextInputSchema = z.object({
  query: z.object({
    pattern: z.string(),
  }),
});

const findFilesInputSchema = z.object({
  query: z.object({
    query: z.string(),
    type: z.enum(["file", "directory"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
});

const fileReadInputSchema = z.object({
  query: z.object({
    path: z.string(),
  }),
});

const authSetInputSchema = z.object({
  path: z.object({
    id: z.string(),
  }),
  body: authSchema,
});

export default oc.router({
  app: oc.router({
    agents: oc
      .output(z.array(agentSchema)),
  }),

  path: oc.router({
    get: oc
      .output(pathInfoSchema),
  }),

  config: oc.router({
    providers: oc
      .output(
        z.object({
          providers: z.array(providerSchema),
          default: z.record(z.string(), z.string()),
        }),
      ),
  }),

  session: oc.router({
    command: oc
      .input(sessionCommandInputSchema)
      .output(sessionCommandOutputSchema),

    shell: oc
      .input(sessionShellInputSchema)
      .output(assistantMessageSchema),
  }),

  find: oc.router({
    text: oc
      .input(findTextInputSchema)
      .output(z.array(findTextMatchSchema)),

    files: oc
      .input(findFilesInputSchema)
      .output(z.array(z.string())),
  }),

  file: oc.router({
    read: oc
      .input(fileReadInputSchema)
      .output(fileContentSchema),
  }),

  auth: oc.router({
    set: oc
      .input(authSetInputSchema)
      .output(z.boolean()),
  }),
});
