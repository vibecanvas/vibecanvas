---
description: Guide to oRPC contracts for type-safe WebSocket APIs in Vibecanvas
mode: subagent
---

# Core Contract: oRPC Contract-First API Design

Vibecanvas uses **oRPC** for type-safe APIs over WebSockets. All communication between the SPA and Server flows through contracts defined in `@vibecanvas/core-contract`.

## Why oRPC?

- **Type Safety**: Contracts provide end-to-end TypeScript types from server to client
- **WebSocket-Only**: No HTTP route paths needed—all API calls use a single `/api` WebSocket connection
- **Contract-First**: Define the API shape before implementation
- **Zod Integration**: Input/output validation using Zod schemas

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE CONTRACT (@vibecanvas/core-contract)   │
│  packages/core-contract/src/*.contract.ts                       │
│  Defines: input/output schemas, procedure signatures           │
└────────────────────────────┬────────────────────────────────────┘
                             │ Imports contract
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (apps/server)                         │
│  apps/server/src/orpc.base.ts     → implements(contract)         │
│  apps/server/src/apis/api.*.ts   → handlers using baseOs        │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket /api
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SPA (apps/spa)                              │
│  apps/spa/src/services/orpc-websocket.ts → createORPCClient    │
│  Full TypeScript types available without code generation        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Writing a Contract

### Basic Structure

```ts
// packages/core-contract/src/<feature>.contract.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

// 1. Define input schemas
const createInputSchema = z.object({
  name: z.string(),
  value: z.number(),
});

const updateInputSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().optional(),
    value: z.number().optional(),
  }),
});

// 2. Define output schemas
const outputSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  createdAt: z.date(),
});

// 3. Export TypeScript types
export type TCreateInput = z.infer<typeof createInputSchema>;
export type TOutput = z.infer<typeof outputSchema>;

// 4. Export router
export default oc.router({
  list: oc
    .output(z.array(outputSchema)),

  create: oc
    .input(createInputSchema)
    .output(outputSchema),

  update: oc
    .input(updateInputSchema)
    .output(outputSchema),

  remove: oc
    .input(z.object({ params: z.object({ id: z.string() }) }))
    .output(z.void()),
});
```

### Register in Root Contract

```ts
// packages/core-contract/src/index.ts
import { oc } from "@orpc/contract";
import featureContract from "./feature.contract";

export const contract = oc.router({
  feature: featureContract,
  // ... other routers
});

export default contract;
```

### Nested Routers

For hierarchical APIs (e.g., `project.dir.files`):

```ts
// packages/core-contract/src/project-dir.contract.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export default oc.router({
  home: oc
    .output(z.object({ path: z.string() })),

  files: oc
    .input(z.object({ 
      query: z.object({ 
        path: z.string(), 
        glob_pattern: z.string().optional(),
        max_depth: z.number().optional(),
      }) 
    }))
    .output(z.union([
      z.object({ root: z.string(), children: z.array(z.any()) }),
      z.object({ type: z.string(), message: z.string() }), // Error shape
    ])),
});

// packages/core-contract/src/index.ts
export const contract = oc.router({
  project: {
    dir: projectDirContract,
  },
});
```

---

## Server Implementation

### Setup Base oRPC

```ts
// apps/server/src/orpc.base.ts
import { implement } from "@orpc/server";
import contract from "@vibecanvas/core-contract";
import db from "@vibecanvas/shell/database/db";

export const baseOs = implement({ api: contract })
  .$context<{ db: typeof db }>()
```

### Write API Handlers

```ts
// apps/server/src/apis/api.<feature>.ts
import { baseOs } from "../orpc.base";
import { ctrlCreateFeature, ctrlDeleteFeature, ctrlUpdateFeature } from "@vibecanvas/core";
import { tExternal } from "@vibecanvas/server/error-fn";

const list = baseOs.api.feature.list.handler(async ({ context: { db } }) => {
  return db.query.features.findMany().sync();
});

const create = baseOs.api.feature.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlCreateFeature({ db }, {
    name: input.name,
    value: input.value,
  });

  if (error || !result) {
    throw new Error(tExternal(error));
  }

  return result;
});

const update = baseOs.api.feature.update.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlUpdateFeature({ db }, {
    id: input.params.id,
    ...input.body,
  });

  if (error || !result) {
    throw new Error(tExternal(error));
  }

  return result;
});

const remove = baseOs.api.feature.remove.handler(async ({ input, context: { db } }) => {
  const [, error] = ctrlDeleteFeature({ db }, { id: input.params.id });
  if (error) {
    throw new Error(tExternal(error));
  }
});

export const feature = { list, create, update, remove };
```

### Wire to Router

```ts
// apps/server/src/api-router.ts
import { feature } from "./apis/api.feature";

export const router = {
  api: {
    feature,
    // ... other APIs
  }
}
```

### WebSocket Server Setup

```ts
// apps/server/src/server.ts
import { RPCHandler } from '@orpc/server/bun-ws';
import { baseOs } from './orpc.base';
import { router } from './api-router';

const handler = new RPCHandler(baseOs.router(router), {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

Bun.serve({
  websocket: {
    open(ws) { /* ... */ },
    message(ws, message) {
      handler.message(ws, message, {
        context: { db }, // Inject dependencies
      });
    },
    close(ws) {
      handler.close(ws);
    },
  },
});
```

---

## Client Implementation

### WebSocket Service

```ts
// apps/spa/src/services/orpc-websocket.ts
import { createORPCClient, createSafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { contract } from "@vibecanvas/core-contract";

const apiContract = { api: contract };

class OrpcWebsocketService {
  readonly websocket: PartySocketWebSocket;
  readonly client: ReturnType<typeof createORPCClient>;
  readonly safeClient: ReturnType<typeof createSafeClient>;

  constructor() {
    const url = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api`;
    
    this.websocket = new PartySocketWebSocket(url, [], {
      connectionTimeout: 4000,
      maxRetries: Infinity,
    });

    const link = new RPCLink({ websocket: this.websocket });
    this.client = createORPCClient(link);
    this.safeClient = createSafeClient(this.client);
  }
}

export const orpcWebsocketService = new OrpcWebsocketService();
```

### Usage in Components

```ts
// Access client
const { client, safeClient } = orpcWebsocketService;

// Call API (fully typed!)
const canvases = await client.api.canvas.list();

// With params
const canvas = await client.api.canvas.get({ params: { id: "123" } });

// Create
const newCanvas = await client.api.canvas.create({
  name: "My Canvas",
  path: "/projects/demo",
  automerge_url: "automerge://...",
});

// Update
await client.api.canvas.update({
  params: { id: "123" },
  body: { name: "Updated Name" },
});
```

---

## Error Handling Patterns

### Throwing Errors (Server)

```ts
const create = baseOs.api.feature.create.handler(async ({ input, context: { db } }) => {
  const [result, error] = ctrlCreateFeature({ db }, input);
  
  if (error || !result) {
    throw new Error(tExternal(error)); // Convert to external message
  }
  
  return result;
});
```

### Union Output (Contract)

For operations that may return errors as data:

```ts
// Contract returns union type
export default oc.router({
  files: oc
    .input(...)
    .output(z.union([
      dirFilesSchema,           // Success
      projectDirErrorSchema,   // Error { type, message }
    ])),
});

// Client handles both cases
const result = await client.api.project.dir.files({ query: { path } });
if ('children' in result) {
  // Success - render children
} else {
  // Error - show message
}
```

---

## Key Conventions

### Naming

- Contract files: `<feature>.contract.ts`
- API handlers: `api.<feature>.ts`
- Router key: lowercase, hyphenated for keys (`agent-logs`, `filetree`)

### Zod Patterns

```ts
// Optional with default
z.string().optional()

// Nullable
z.string().nullable()

// Union types
z.union([SchemaA, SchemaB])

// Nested objects
z.object({
  params: z.object({ id: z.string() }),
  body: z.object({ ... }),
})

// Recursive schemas
const nodeSchema: z.ZodType<TNode> = baseNodeSchema.extend({
  children: z.lazy(() => z.array(nodeSchema)),
});
```

### Context Injection

```ts
// Server handler receives context
handler.message(ws, message, {
  context: { db }, // Available in handler as context.db
})
```

---

## Testing Contracts

Contracts can be tested independently:

```ts
import { describe, test, expect } from 'bun:test';
import contract from './feature.contract';

describe('feature contract', () => {
  test('validates create input', () => {
    const result = contract.feature.create.input.safeParse({
      name: 'Test',
      value: 42,
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid input', () => {
    const result = contract.feature.create.input.safeParse({
      name: 123, // Should be string
    });
    expect(result.success).toBe(false);
  });
});
```

---

## File Structure

```
packages/core-contract/src/
├── index.ts                    # Root router aggregation
├── canvas.contract.ts          # Canvas CRUD
├── chat.contract.ts            # Chat CRUD
├── filetree.contract.ts        # Filetree widget CRUD
├── project-dir.contract.ts     # Filesystem operations
├── file.contract.ts            # File upload
├── ai.contract.ts              # AI agent APIs
├── db.contract.ts              # Database events
├── notification.contract.ts    # Notifications
└── agent-logs.contract.ts       # Agent logging
```
