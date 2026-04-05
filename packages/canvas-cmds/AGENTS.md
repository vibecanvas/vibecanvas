# AGENTS.md

Guidelines for implementing commands in `packages/canvas-cmds`.

## Purpose

This package contains the **pure command layer** for canvas commands.

It should:
- accept explicit inputs
- use a small injected portal of services
- return structured machine-friendly results
- throw structured command errors
- avoid CLI concerns, transport concerns, and side-effect orchestration outside the command itself

This package is the base implementation for future missing canvas commands.

---

## Design rules

### 1. Commands are pure application functions
Commands here should be implemented as small async functions like:
- `fxExecuteCanvasList(...)`
- `fxExecuteCanvasQuery(...)`

They should not:
- parse argv
- print to stdout/stderr
- call `process.exit`
- depend on HTTP/orpc details
- depend on server CLI helpers

They should:
- take explicit typed input
- take an explicit typed portal
- return typed success payloads
- throw typed error details on failure

---

### 2. Use the `fx.cmd.*.ts` structure
Put commands in:
- `src/cmds/fx.cmd.<name>.ts`

Tests go in:
- `tests/cmds/fx.cmd.<name>.test.ts`

Follow the existing style from:
- `src/cmds/fx.cmd.list.ts`
- `src/cmds/fx.cmd.query.ts`

---

### 3. Portal dependencies must stay minimal
At the moment, commands in this package should require **only these services when needed**:
- `dbService`
- `automergeService`

Rules:
- if a command only needs DB access, inject only `dbService`
- if a command needs canvas document access, inject `automergeService` too
- do **not** introduce extra services unless there is a very strong reason and the package contract is intentionally expanded later

Current expectation:
- most commands need `dbService`
- some commands also need `automergeService`
- no event publisher, no CLI service, no server bootstrap service

---

## Implementation pattern

### Command shape
Use this general structure:

```ts
export type TPortal = {
  dbService: IDbService;
  automergeService?: IAutomergeService;
}

export async function fxExecuteSomething(
  portal: TPortal,
  input: TSomethingInput,
): Promise<TSomethingSuccess> {
  try {
    // implementation
    return { ok: true, ... }
  } catch (error) {
    const errorDetails: TCanvasCmdErrorDetails = {
      ok: false,
      command: 'canvas.<name>',
      code: 'SOME_ERROR_CODE',
      message: error instanceof Error ? error.message : String(error),
    }
    throw errorDetails
  }
}
```

Notes:
- if the command has no input, omit the input arg
- keep success payloads explicit and stable
- keep error codes stable and machine-readable

---

### Error handling
Use `TCanvasCmdErrorDetails` for thrown errors.

Rules:
- throw structured objects, not raw strings
- prefer stable codes like:
  - `CANVAS_LIST_FAILED`
  - `CANVAS_QUERY_FAILED`
  - `CANVAS_SELECTOR_NOT_FOUND`
- include `canvasId` and `canvasNameQuery` when relevant
- if you intentionally throw a structured command error inside helpers, let it propagate
- only wrap unknown/unstructured failures at the top level of the command

---

### Data conversion
Commands should normalize persistence-layer fields into command-layer output.

Examples:
- `created_at` -> `createdAt`
- `automerge_url` -> `automergeUrl`
- dates -> ISO strings using shared helpers like `toIsoString(...)`

Do not leak raw DB naming conventions into result payloads.

---

## Service usage rules

### DB service
Use `dbService` for:
- listing canvases
- selecting canvas rows
- reading persisted metadata

Do not bypass the service to query storage directly unless the service contract is intentionally expanded.

---

### Automerge service
Use `automergeService` only when a command needs document contents.

Typical flow:
1. resolve the canvas row from DB
2. load the Automerge handle from `automergeService.repo`
3. await `handle.whenReady()`
4. read `handle.doc()`
5. clone data before returning derived payloads when needed

Example:

```ts
const handle = await portal.automergeService.repo.find<TCanvasDoc>(row.automerge_url as never)
await handle.whenReady()
const doc = handle.doc()
if (!doc) throw new Error(`Canvas doc '${row.automerge_url}' is unavailable.`)
```

---

## What belongs here vs elsewhere

### Belongs here
- command execution logic
- canvas selection logic
- document querying logic
- mutation logic on loaded docs when needed by a command
- shaping stable result payloads
- structured command errors

### Does not belong here
- CLI argv parsing
- text rendering
- JSON printing
- `process.exit`
- server route wiring
- orpc error translation
- environment/bootstrap resolution

Those belong in higher layers like CLI or API packages.

---

## Testing rules

Every command should have direct tests in `packages/canvas-cmds/tests/cmds`.

Test the command function itself, not CLI wrappers.

### For DB-only commands
Use `DbServiceBunSqlite` with an in-memory DB when possible.

### For commands that use Automerge
Use:
- `DbServiceBunSqlite` for canvas rows
- `AutomergeService` for document storage
- a real SQLite file path for Automerge tests

Important:
- do **not** share the same already-open SQLite connection between DB service and Automerge service in tests
- prefer a temporary SQLite file path for Automerge service to avoid async save/close races

### Assertions
Prefer stable assertions:
- use `toMatchObject(...)` when timestamps or extra fields are not the point
- avoid brittle checks for generated times unless the test is specifically about them
- assert exact payload shape where stability matters

---

## Style guidance

- Keep command files small and focused
- Extract pure helpers inside the same file first
- Only create shared helpers when at least 2 commands clearly need them
- Prefer explicit types over implicit shapes
- Prefer stable sorted output when returning collections
- Keep naming consistent with existing commands

---

## Current baseline

As of now, `canvas-cmds` commands should be built on this assumption:

- max required services: `dbService` and `automergeService`
- no other services are needed
- commands expose typed programmatic APIs
- CLI/API layers wrap these commands later

This is the foundation for implementing the remaining missing commands in this package.
