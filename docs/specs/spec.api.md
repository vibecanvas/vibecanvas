---
description: How to build a @vibecanvas/api-* package (contract + handlers) for the CLI ORPC router
mode: subagent
---

# API Package Spec

This spec describes how a `packages/api-*` package is structured. Each package owns one ORPC sub-router (e.g. `canvas`, `file`, `filetree`, `pty`) and is consumed by `apps/cli` via the shared ORPC plugin.

The filetree package (`packages/api-filetree`) is the reference implementation.

## Goals

- **Contract-first**: inputs, outputs, and errors are declared as ORPC contracts with Zod schemas — handlers infer their types from the contract, never re-declare them.
- **Service-oriented**: handlers only talk to service interfaces (`IDbService`, `IEventPublisherService`, `IAutomergeService`, `IFilesystemService`, `IPtyService`, …). They never import concrete implementations.
- **Thin, per-endpoint handler files**: one handler per file, one file per contract procedure.
- **No barrel exports**: every file is reachable via `@vibecanvas/api-xxx/<file>`; consumers deep-import what they need.

## Directory layout

```
packages/api-<name>/
  package.json
  tsconfig.json
  src/
    contract.ts              # ORPC contract (Zod schemas in/out)
    types.ts                 # TXxxApiContext (services the handlers need)
    orpc.ts                  # baseXxxOs = implement(contract).$context<TXxxApiContext>()
    api.<verb>-<name>.ts     # one handler per file, uses baseXxxOs.<op>.handler
    handlers.ts              # collects { op: apiXxxVerb } into xxxHandlers
```

## package.json

```json
{
  "name": "@vibecanvas/api-<name>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "@orpc/contract": "catalog:",
    "@orpc/server": "catalog:",
    "zod": "catalog:"
    // plus any @vibecanvas/* service packages whose interfaces appear in TXxxApiContext
  }
}
```

Rules:
- `"exports": { "./*": "./src/*.ts" }` — deep-import only, no `index.ts`.
- Depend on **interface packages only** (`@vibecanvas/db`, `@vibecanvas/event-publisher-service`, `@vibecanvas/automerge-service`, etc.), never on concrete classes or `apps/*`.

## contract.ts

Declare the ORPC sub-router with Zod schemas for input and output. Reuse Drizzle-derived schemas (`ZCanvasSelect`, `ZFileTreeSelect`, …) from `@vibecanvas/db/schema` whenever the output is a DB row.

```ts
import { oc } from '@orpc/contract';
import { ZFileTreeSelect } from '@vibecanvas/db/schema';
import { z } from 'zod';

const createFiletreeInputSchema = z.object({
  canvas_id: z.string(),
  path: z.string().optional(),
  x: z.number(),
  y: z.number(),
});

const updateFiletreeBodySchema = z.object({
  title: z.string().optional(),
  path: z.string().optional(),
  locked: z.boolean().optional(),
  glob_pattern: z.string().nullable().optional(),
});

const filetreeContract = oc.router({
  create: oc.input(createFiletreeInputSchema).output(ZFileTreeSelect),
  update: oc
    .input(z.object({ params: z.object({ id: z.string() }), body: updateFiletreeBodySchema }))
    .output(ZFileTreeSelect),
  remove: oc.input(z.object({ params: z.object({ id: z.string() }) })).output(z.void()),
});

export { filetreeContract };
```

Conventions:
- Named schemas live at module top and are not exported unless a handler file needs them.
- One router per package; nested routers (`cmd: oc.router({ … })`) are allowed if the domain has sub-commands.
- Streaming endpoints use `eventIterator(zSomeEvent)` as their output schema.

## types.ts

Declare the context object the handlers need. It lists **interfaces only**, plus `requestId?: string` for correlation.

```ts
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher-service/IEventPublisherService';

type TFiletreeApiContext = {
  db: IDbService;
  eventPublisher: IEventPublisherService;
  automerge: IAutomergeService;
  requestId?: string;
};

export type { TFiletreeApiContext };
```

Rules:
- No concrete classes.
- The base ORPC context in `apps/cli/src/plugins/orpc/orpc.base.ts` must be a **superset** of every `TXxxApiContext` — adding a new service here means registering it in `setup-services.ts` and extending `baseOs.$context<…>()`.

## orpc.ts

A single line of boilerplate — creates the typed builder that every handler file imports.

```ts
import { implement } from '@orpc/server';
import { filetreeContract } from './contract';
import type { TFiletreeApiContext } from './types';

const baseFiletreeOs = implement(filetreeContract)
  .$context<TFiletreeApiContext>();

export { baseFiletreeOs };
```

Why it lives in its own file: every `api.<verb>-<name>.ts` imports `baseFiletreeOs`. Keeping it separate from `handlers.ts` avoids circular imports.

## api.<verb>-<name>.ts (one per endpoint)

Each handler file builds a **ready procedure** with `baseXxxOs.<op>.handler(async ({ input, context }) => { … })`. The input, output, error, and context types are all inferred from the contract — **never redeclare them**.

```ts
import { ORPCError } from '@orpc/server';
import { baseFiletreeOs } from './orpc';

const apiUpdateFiletree = baseFiletreeOs.update.handler(async ({ input, context }) => {
  const filetree = context.db.updateFileTree({ id: input.params.id, ...input.body });
  if (!filetree) {
    throw new ORPCError('NOT_FOUND', { message: 'Filetree not found' });
  }

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'update', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
});

export { apiUpdateFiletree };
```

Rules:
- **Never** write `type TInput = { … }` and then annotate the handler signature manually. The whole point of `baseXxxOs.<op>.handler` is that it pulls types from the contract.
- Throw `ORPCError` from `@orpc/server` for recoverable error states; let unexpected errors bubble.
- Side effects that need to fire on success (event publish, cache invalidation) happen after the db mutation succeeds, not before.
- Rollback compensating writes on downstream failure (see `api.create-filetree.ts` for the db-insert → automerge-mutate → rollback pattern).
- Streaming endpoints are async generators: `baseXxxOs.<op>.handler(async function* ({ input, context }) { yield … })`.
- WIP endpoints still use the pattern but with a body that throws: `baseXxxOs.create.handler(async () => { throw new Error('… WIP'); })`.

## handlers.ts

Collects the pre-built handlers into the shape the contract router expects. No `implement()` calls here, no `.handler()` wrapping — the handler files already did that.

```ts
import { apiCreateFiletree } from './api.create-filetree';
import { apiRemoveFiletree } from './api.remove-filetree';
import { apiUpdateFiletree } from './api.update-filetree';
import { baseFiletreeOs } from './orpc';

const filetreeHandlers = {
  create: apiCreateFiletree,
  update: apiUpdateFiletree,
  remove: apiRemoveFiletree,
};

export { baseFiletreeOs, filetreeHandlers };
```

The map's keys must match the contract router shape exactly — nested routers mirror the contract's nesting (e.g. `cmd: { list: apiCmdList, … }`).

## Wiring into apps/cli

Once the package compiles, attach it in three places:

1. **`apps/cli/src/plugins/orpc/orpc.base.ts`** — add the contract to the aggregated router and ensure `$context<…>()` includes every service the package needs.
2. **`apps/cli/src/plugins/orpc/router.ts`** — add the handler map under `api.<name>`.
3. **`apps/cli/src/plugins/orpc/OrpcPlugin.ts`** — pull any new service via `ctx.services.require('…')` and pass it in the `context` object of `handler.message(...)`.

If the package introduces a new service interface that no existing package provides, also register it in `apps/cli/src/setup-services.ts` (declaration merge on `IServiceMap` + `services.provide(name, impl)`).

## Verification

```sh
bunx tsc --noEmit -p packages/api-<name>/tsconfig.json
bunx tsc --noEmit -p apps/cli/tsconfig.json
```

Both must pass. A type error in `handlers.ts` complaining about `Lazyable<…>` / `ImplementedProcedure` mismatches almost always means either (a) the contract router shape and the handlers map shape diverge, or (b) a handler file still uses the plain-function-then-wrap pattern.

## Checklist for a new api package

- [ ] `package.json` with `./*` deep-import exports, only interface deps
- [ ] `contract.ts` with Zod schemas (no handler logic)
- [ ] `types.ts` with `TXxxApiContext` referencing only interfaces
- [ ] `orpc.ts` exporting `baseXxxOs = implement(contract).$context<TXxxApiContext>()`
- [ ] One `api.<verb>-<name>.ts` per contract procedure, using `baseXxxOs.<op>.handler`
- [ ] `handlers.ts` assembling the handlers map, no re-wrapping
- [ ] Wired into `orpc.base.ts`, `router.ts`, `OrpcPlugin.ts`
- [ ] `bunx tsc --noEmit` clean for the package and for `apps/cli`
