import type { Event as OpenCodeEvent, OpencodeClient } from "@opencode-ai/sdk/v2";
import { eventIterator, oc, type } from "@orpc/contract";
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
  z.object({
    text: filePartSourceTextSchema,
    type: z.literal("resource"),
    clientName: z.string(),
    uri: z.string(),
  }),
]);

type TConfigGetOutput = Awaited<ReturnType<OpencodeClient["config"]["get"]>> extends { data: infer TData }
  ? NonNullable<TData>
  : never;

type TMethodData<TMethod> = TMethod extends (...args: any[]) => Promise<infer TResult>
  ? TResult extends { data: infer TData }
    ? NonNullable<TData>
    : never
  : never;

type TMethodInput<TMethod> = TMethod extends (input: infer TInput, ...args: any[]) => unknown
  ? TInput
  : never;

type TAppLogInput = TMethodInput<OpencodeClient["app"]["log"]>;
type TAppLogOutput = TMethodData<OpencodeClient["app"]["log"]>;
type TAppAgentsOutput = TMethodData<OpencodeClient["app"]["agents"]>;
type TConfigProvidersOutput = TMethodData<OpencodeClient["config"]["providers"]>;

type TSessionListOutput = TMethodData<OpencodeClient["session"]["list"]>;
type TSessionOutput = TMethodData<OpencodeClient["session"]["get"]>;
type TSessionGetInput = TMethodInput<OpencodeClient["session"]["get"]>;
type TSessionChildrenInput = TMethodInput<OpencodeClient["session"]["children"]>;
type TSessionCreateInput = TMethodInput<OpencodeClient["session"]["create"]>;
const sessionInitInputSchema = z.object({
  chatId: z.string(),
  body: z.object({
    path: z.string().optional(),
    modelID: z.string().optional(),
    providerID: z.string().optional(),
    messageID: z.string().optional(),
  }).optional(),
});
type TSessionAbortInput = TMethodInput<OpencodeClient["session"]["abort"]>;
type TSessionAbortOutput = TMethodData<OpencodeClient["session"]["abort"]>;
type TSessionSummarizeInput = TMethodInput<OpencodeClient["session"]["summarize"]>;
type TSessionSummarizeOutput = TMethodData<OpencodeClient["session"]["summarize"]>;
type TSessionRevertInput = TMethodInput<OpencodeClient["session"]["revert"]>;
type TSessionUnrevertInput = TMethodInput<OpencodeClient["session"]["unrevert"]>;
type TSessionUpdateInput = TMethodInput<OpencodeClient["session"]["update"]>;
type TSessionUpdateOutput = TMethodData<OpencodeClient["session"]["update"]>;
type TSessionMessagesOutput = TMethodData<OpencodeClient["session"]["messages"]>;
type TPtyListOutput = TMethodData<OpencodeClient["pty"]["list"]>;
type TPtyCreateOutput = TMethodData<OpencodeClient["pty"]["create"]>;
type TPtyGetOutput = TMethodData<OpencodeClient["pty"]["get"]>;
type TPtyUpdateOutput = TMethodData<OpencodeClient["pty"]["update"]>;
type TPtyRemoveOutput = TMethodData<OpencodeClient["pty"]["remove"]>;

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
  chatId: z.string(),
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
  chatId: z.string(),
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

const sessionUpdateInputSchema = z.object({
  chatId: z.string(),
  body: z.object({
    title: z.string().optional(),
  }),
});

const sessionMessagesInputSchema = z.object({
  chatId: z.string(),
  query: z.object({
    limit: z.number().int().positive().optional(),
  }).optional(),
});

const findTextInputSchema = z.object({
  chatId: z.string(),
  query: z.object({
    pattern: z.string(),
  }),
});

const findFilesInputSchema = z.object({
  chatId: z.string(),
  query: z.object({
    query: z.string(),
    type: z.enum(["file", "directory"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
});

const fileReadInputSchema = z.object({
  chatId: z.string(),
  query: z.object({
    path: z.string(),
  }),
});

const authSetInputSchema = z.object({
  chatId: z.string(),
  path: z.object({
    id: z.string(),
  }),
  body: authSchema,
});

const ptyScopedInputSchema = z.object({
  workingDirectory: z.string(),
});

const ptyCreateInputSchema = z.object({
  workingDirectory: z.string(),
  body: z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    title: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
  }).optional(),
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
  body: z.object({
    title: z.string().optional(),
    size: z.object({
      rows: z.number().int().positive(),
      cols: z.number().int().positive(),
    }).optional(),
  }),
});

const chatScopedInputSchema = z.object({
  chatId: z.string(),
});

const promptInputSchema = z.object({
  chatId: z.string(),
  agent: z.string().optional(),
  model: z.object({
    providerID: z.string(),
    modelID: z.string(),
  }).optional(),
  parts: z.array(z.discriminatedUnion("type", [
    z.object({
      id: z.string().optional(),
      type: z.literal("text"),
      text: z.string(),
      synthetic: z.boolean().optional(),
      ignored: z.boolean().optional(),
      time: z.object({
        start: z.number(),
        end: z.number().optional(),
      }).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("file"),
      mime: z.string(),
      filename: z.string().optional(),
      url: z.string(),
      source: filePartSourceSchema.optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("agent"),
      name: z.string(),
      source: z.object({
        value: z.string(),
        start: z.number(),
        end: z.number(),
      }).optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("subtask"),
      prompt: z.string(),
      description: z.string(),
      agent: z.string(),
      model: z.object({
        providerID: z.string(),
        modelID: z.string(),
      }).optional(),
      command: z.string().optional(),
    }),
  ])),
});

const eventsInputSchema = z.object({
  chatId: z.string(),
});

export default oc.router({
  prompt: oc
    .input(promptInputSchema)
    .output(sessionCommandOutputSchema),

  events: oc
    .input(eventsInputSchema)
    .route({ method: "GET" })
    .output(eventIterator(type<OpenCodeEvent>())),

  app: oc.router({
    log: oc
      .input(type<TAppLogInput>())
      .output(type<TAppLogOutput>()),

    agents: oc
      .input(chatScopedInputSchema)
      .output(type<TAppAgentsOutput>()),
  }),

  path: oc.router({
    get: oc
      .input(chatScopedInputSchema)
      .output(pathInfoSchema),
  }),

  config: oc.router({
    get: oc
      .input(chatScopedInputSchema)
      .output(type<TConfigGetOutput>()),

    providers: oc
      .input(chatScopedInputSchema)
      .output(type<TConfigProvidersOutput>()),
  }),

  session: oc.router({
    list: oc
      .output(type<TSessionListOutput>()),

    get: oc
      .input(type<TSessionGetInput>())
      .output(type<TSessionOutput>()),

    children: oc
      .input(type<TSessionChildrenInput>())
      .output(type<TSessionListOutput>()),

    create: oc
      .input(type<TSessionCreateInput>())
      .output(type<TSessionOutput>()),

    init: oc
      .input(sessionInitInputSchema)
      .output(z.boolean()),

    abort: oc
      .input(type<TSessionAbortInput>())
      .output(type<TSessionAbortOutput>()),

    summarize: oc
      .input(type<TSessionSummarizeInput>())
      .output(type<TSessionSummarizeOutput>()),

    revert: oc
      .input(type<TSessionRevertInput>())
      .output(type<TSessionOutput>()),

    unrevert: oc
      .input(type<TSessionUnrevertInput>())
      .output(type<TSessionOutput>()),

    update: oc
      .input(sessionUpdateInputSchema)
      .output(type<TSessionUpdateOutput>()),

    current: oc
      .input(chatScopedInputSchema)
      .output(type<TSessionOutput>()),

    messages: oc
      .input(sessionMessagesInputSchema)
      .output(type<TSessionMessagesOutput>()),

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

  pty: oc.router({
    list: oc
      .input(ptyScopedInputSchema)
      .output(type<TPtyListOutput>()),

    create: oc
      .input(ptyCreateInputSchema)
      .output(type<TPtyCreateOutput>()),

    get: oc
      .input(ptyPathInputSchema)
      .output(type<TPtyGetOutput>()),

    update: oc
      .input(ptyUpdateInputSchema)
      .output(type<TPtyUpdateOutput>()),

    remove: oc
      .input(ptyPathInputSchema)
      .output(type<TPtyRemoveOutput>()),
  }),
});
