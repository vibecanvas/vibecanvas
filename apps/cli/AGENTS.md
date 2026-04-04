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
