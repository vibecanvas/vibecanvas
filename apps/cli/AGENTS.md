# apps/cli

`apps/cli` is the new runtime home for Vibecanvas.

It should gradually replace `apps/server` as command/bootstrap wiring moves over.

## Core rule

- **plugins contain logic and composition**
- **services do I/O / networking / resource management**

In short:

- plugin = orchestration / wiring / command behavior
- service = stateful capability / side effect boundary

## Plugin vs service

### Plugins
Plugins:
- decide how the app is assembled
- depend on services
- tap hooks
- read config
- may provide additional services
- may coordinate multiple services

Plugins should contain logic like:
- command handling
- route/protocol composition
- app lifecycle orchestration
- conditional behavior based on config

Plugins should **not** be the place where low-level I/O resources are implemented.

Examples in `apps/cli`:
- `CliPlugin`
- `ServerPlugin`
- `OrpcPlugin`

### Services
Services:
- perform I/O
- manage external resources
- manage stateful runtime capabilities
- expose methods to plugins

Services are the boundary for things like:
- database access
- filesystem access
- PTY/session management
- network clients/servers
- CRDT repos

Examples:
- `IDbService`
- future filesystem/pty/automerge services

## Dependency direction

Preferred direction:

```text
plugin -> service contract -> concrete service implementation
```

Avoid:

```text
plugin -> concrete implementation details
```

Example:
- good: plugin depends on `IDbService`
- bad: plugin depends on Bun SQLite internals directly

## How to use `@vibecanvas/runtime`

`@vibecanvas/runtime` is the generic composition layer.

It provides:
- `IPlugin`
- `IPluginContext`
- `IServiceMap`
- `IServiceRegistry`
- `createServiceRegistry()`
- `createRuntime()`
- `topoSort()`

It does **not** provide CLI semantics.

That means `apps/cli` owns:
- `ICliConfig`
- `ICliHooks`
- `createCliHooks()`
- `bootCliRuntime()`
- `shutdownCliRuntime()`

## Runtime pattern in apps/cli

The expected flow is:

1. parse argv
2. build fully resolved `ICliConfig`
3. setup foundational services
4. create runtime
5. register plugins
6. boot runtime

Current bootstrap files:

```text
src/
  parse-argv.ts
  build-config.ts
  setup-services.ts
  setup-signals.ts
  hooks.ts
  main.ts
```

## Config ownership

`apps/cli` owns config.

Do not move CLI-specific config back into `@vibecanvas/runtime`.

`ICliConfig` should be fully resolved before runtime creation.

That means values like these should already be set:
- `port`
- `dbPath`
- `configPath`
- `dataPath`
- `cachePath`

## Hooks usage

CLI hooks are app-local transport/lifecycle hooks:
- `boot`
- `ready`
- `shutdown`
- `httpRequest`
- `wsUpgrade`
- `wsOpen`
- `wsMessage`
- `wsClose`
- `registerCommands`

Use hooks for app/runtime coordination.

Do **not** use hooks as a replacement for normal service interfaces when a service method would be clearer.

## Current guidance for this app

### Keep in plugins
- command behavior
- server transport wiring
- ORPC protocol wiring
- lifecycle coordination

### Keep in services
- DB access
- future PTY manager
- future filesystem watcher
- future automerge repo

## Deep import policy

Prefer deep imports for extracted packages.

Examples:
- `@vibecanvas/db/IDbService`
- `@vibecanvas/db/DbServiceBunSqlite`
- `@vibecanvas/api-canvas/contract`
- `@vibecanvas/api-file/handlers`

Avoid introducing new root barrel exports when the package is intended to stay deep-import-only.

## Migration guidance

`apps/server` is still legacy.

When moving code into `apps/cli`:
- extract contracts/services first
- keep implementations small and explicit
- prefer WIP wiring over hidden magic
- move one boundary at a time

## Practical rules

1. If it manages a resource, it is probably a service.
2. If it coordinates behavior, it is probably a plugin.
3. Plugins may depend on services.
4. Services should not depend on plugins.
5. Keep runtime generic; keep CLI semantics in `apps/cli`.
6. Keep package boundaries explicit with deep imports.

## How CLI commands work

This app has **two execution paths**:

### 1. Top-level CLI path in `src/main.ts`

`src/main.ts` is the real entrypoint.

It does this in order:

1. rewrite top-level canvas aliases
   - `vibecanvas list` -> `vibecanvas canvas list`
   - `vibecanvas query` -> `vibecanvas canvas query`
   - `vibecanvas move` -> `vibecanvas canvas move`
2. run canvas `--db` bootstrap validation early
3. parse top-level flags
4. if command is `canvas`, dispatch into `src/canvas-cli/*`
5. otherwise boot the runtime for normal app/server behavior

So:
- `canvas` commands are handled **before** runtime boot
- `serve` / websocket / ORPC behavior is handled by runtime boot

### 2. Runtime/plugin path

If the command is not a direct canvas CLI command, `main.ts` boots runtime with:
- `setup-services.ts`
- `createCliPlugin()`
- `createOrpcPlugin()`
- `createPtyPlugin()`
- `createAutomergePlugin()`
- `createServerPlugin()`

This is the long-lived app path.

## Canvas CLI structure

Canvas CLI code lives under:

```text
src/canvas-cli/
  bootstrap.ts
  local-state.ts
  cmd.canvas.ts
  cmd.query.ts
  cmd.move.ts
  cmd.patch.ts
```

### Responsibilities

#### `bootstrap.ts`
Early `--db` validation.

Important rule:
- fail **before** importing stateful db/automerge code when `--db` is malformed

This keeps tests deterministic and avoids accidental side effects.

#### `local-state.ts`
Builds local, short-lived command state for offline canvas commands.

It creates:
- sqlite db service
- automerge repo over sqlite storage
- `TCanvasCmdContext` for `@vibecanvas/canvas-cmds`

This file is the local adapter from app CLI -> shared command package.

#### `cmd.canvas.ts`
Canvas command router.

It:
- parses `vibecanvas canvas ...`
- prints canvas top-level help
- routes to `list`, `query`, `move`, `patch`
- prints not-implemented errors for the remaining planned commands

#### `cmd.query.ts`
Query-specific argv parsing + help + output.

It should:
- parse flags
- build shared selector envelope
- call `executeCanvasQuery()` from `@vibecanvas/canvas-cmds`
- print json/text
- convert thrown command errors into CLI stderr + exit code

#### `cmd.move.ts`
Move-specific argv parsing + help + output.

It should:
- parse flags
- normalize ids / x / y / mode
- call `executeCanvasMove()` from `@vibecanvas/canvas-cmds`
- print json/text
- convert thrown command errors into CLI stderr + exit code

#### `cmd.patch.ts`
Patch-specific argv parsing + help + output.

It should:
- parse flags
- load the patch payload from inline json, file, or stdin
- call `executeCanvasPatch()` from `@vibecanvas/canvas-cmds`
- print json/text
- convert thrown command errors into CLI stderr + exit code

## Shared command rule

`apps/cli` should not reimplement canvas logic.

Shared behavior belongs in:
- `@vibecanvas/canvas-cmds`

`apps/cli/src/canvas-cli/*` should only own:
- argv parsing
- help text
- stdout/stderr rendering
- process exit behavior
- local command context creation

If changing selection / query / move semantics:
- prefer updating `packages/canvas-cmds`
- keep `apps/cli` wrappers thin

## Command output rule

For canvas CLI commands:
- human output goes to `stdout`
- machine-readable success goes to `stdout` as json when `--json`
- errors go to `stderr`
- non-zero exit for failures

Keep this stable. Tests depend on it.

## DB path rule

Important boundary:
- `dbPath` is CLI/bootstrap concern
- `dbPath` should not leak into `@vibecanvas/canvas-cmds`

That means:
- top-level CLI can still print resolved db path where useful
- shared command package should not depend on db path existing in its context

## Testing strategy for CLI commands

The reference spirit comes from legacy server CLI tests, but the active test home is now:

```text
apps/cli/tests/cli/
```

Key files:

```text
harness.ts
harness.worker.ts
db-path.test.ts
list/cmd.list.test.ts
query/cmd.query.test.ts
query/cmd.query.filters.test.ts
move/cmd.move.test.ts
```

### `harness.ts`
Creates an isolated temp sandbox per test context.

It provides helpers to:
- create temp config/data/cache dirs
- initialize a fresh sqlite database
- run the real CLI entrypoint
- seed canvases and docs
- read persisted automerge docs back out

### `harness.worker.ts`
Does low-level sqlite/automerge fixture work in a subprocess.

Use this when tests need to:
- seed canvas rows
- seed persisted automerge docs
- inspect persisted docs after a command runs

### What CLI tests should assert

For every command, prefer end-to-end assertions on:
- exit code
- stdout
- stderr
- json payload stability
- persisted sqlite/automerge side effects

This is better than unit-testing wrappers only.

## When adding a new canvas command

Example: `patch`, `group`, `delete`, etc.

Follow this order:

1. add shared execution to `packages/canvas-cmds`
2. add/extend local adapter needs in `src/canvas-cli/local-state.ts` only if necessary
3. add `src/canvas-cli/cmd.<name>.ts`
4. route it from `src/canvas-cli/cmd.canvas.ts`
5. add end-to-end tests in `apps/cli/tests/cli/<name>/`
6. keep help text and error shape stable

## Keep these boundaries clean

### Good
- `main.ts` decides command path
- `canvas-cli/*` parses args and prints
- `canvas-cmds` executes shared logic
- tests spawn the real CLI entrypoint

### Bad
- duplicating query/move logic in `apps/cli`
- leaking dbPath into shared command context
- booting full runtime just to run local canvas CLI commands
- testing only helper functions and skipping subprocess assertions
