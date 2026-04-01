---
description: Specifics for the Orchestration Server in apps/server/
mode: subagent
---

# Apps: Server

The Server is the local orchestration layer of Vibecanvas. It runs on the user's machine and bridges the frontend SPA to local system capabilities such as the filesystem, PTY sessions, SQLite-backed persistence, and Automerge document sync.

## Tech Stack

- **Bun**: Runtime and package manager.
- **oRPC**: Framework for type-safe APIs over WebSockets.
- **Automerge Repo**: Handles CRDT synchronization and storage.
- **Drizzle ORM**: SQLite database management.
- **`@vibecanvas/shell`**: Shared shell-layer services for database access, PTY management, filesystem watching, and Automerge server setup.

## Key Responsibilities

### 1. API Orchestration (`src/apis`)
The server implements the contract defined in `@vibecanvas/core-contract`.
- **Canvas APIs**: CRUD for canvases and their metadata.
- **File APIs**: Store, clone, and delete DB-backed file blobs exposed under `/files/*`.
- **Filesystem APIs**: Listing directories, reading/writing files, moving files, inspecting files, and watching directories.
- **PTY APIs**: Listing, creating, updating, and deleting terminal sessions.
- **Database Events**: Streaming updates to the SPA when records change.
- **Notification Events**: Streaming server notifications such as update availability.

### 2. Automerge Host
The server provides the persistence layer for the CRDT documents.
- **Storage**: Maps Automerge URLs to rows in the SQLite database.
- **Network Bridge**: Forwards binary changes between multiple connected SPA instances (if applicable).

### 3. PTY Session Management
- **PTY Runtime**: Initializes `PtyService` on server startup.
- **Session Lifecycle**: Supports PTY list/create/get/update/remove via oRPC.
- **Native PTY Transport**: Attaches live terminals over `/api/pty/:ptyID/connect` WebSockets, with replay support via `cursor` query params.
- **Shutdown Handling**: Cleans up PTY state on process exit, `SIGINT`, and `SIGTERM`.

### 4. Production Hosting
In compiled mode, the server:
- Embeds the SPA assets (via `embedded-assets.ts`).
- Provides an all-in-one executable for the user.
- Handles port resolution atomically (falling forward from `7496` if busy).
- Runs background upgrade checks and can publish update notifications to connected clients.

### 5. CLI Entry Point
`src/main.ts` is the Bun CLI entry point.
- **Default command**: `serve`
- **Other command**: `upgrade`
- **Top-level flags**: `--help`, `--version`, `--port`, `--upgrade`
- **Backward compatibility**: A positional numeric first argument is treated as the port.
- **Default ports**: `3000` in dev, `7496` in compiled builds.

## Directory Structure

- `src/main.ts`: CLI entry point (handles `serve`, `upgrade`, top-level flags, and port parsing).
- `src/server.ts`: The core `Bun.serve` implementation.
- `src/api-router.ts`: Wiring of all oRPC handlers.
- `src/apis/`: Individual API implementations.
- `src/automerge-repo.ts`: Lazily initializes the Automerge repo and websocket adapter.
- `src/cmd.upgrade.ts`: CLI implementation for the `upgrade` subcommand.
- `src/runtime.ts`: Build/runtime constants and update-related environment helpers.
- `src/update/`: Logic for the self-update mechanism.

## Error Handling Middleware

Most error translation is handled by a global `onError` middleware in `orpc.base.ts`, but the codebase uses a few patterns depending on the contract shape.

### How It Works

1. **Type guard** (`isErrorEntry`): Checks if a thrown value is a `TErrorEntry` (has `code: string` and `statusCode: number`).
2. **Middleware** (`.use(onError(...))`): Catches all thrown errors and routes them:
   - `TErrorEntry` → translates via `tExternal()`, optionally logs via `tInternal()`, re-throws as `ORPCError`.
   - `ORPCError` → re-throws as-is.
   - Unknown → wraps in a generic `ORPCError('UNKNOWN')`.

### Handler Pattern

For controller-backed endpoints, handlers often throw the `TErrorEntry` directly and let middleware translate it:

```typescript
const create = baseOs.api.canvas.create.handler(async ({ input, context: { db, repo } }) => {
  const [result, error] = ctrlCreateCanvas({ db, repo }, {
    name: input.name,
    automerge_url: input.automerge_url,
  });
  if (error) throw error;       // TErrorEntry — middleware handles translation
  return result;
});
```

**Do not** wrap errors in `new Error(...)` or `new ORPCError(...)` inside handlers. Just `throw error`.

### Current exceptions to that pattern

- **Filesystem handlers** often return success/error unions directly because their contracts model explicit `{ type, message }` error responses.
- **PTY and some filetree handlers** may throw `ORPCError` directly for simple transport concerns like `NOT_FOUND` or `CONFLICT`.

## Integration Patterns

- **Context Injection**: Every oRPC request has access to `db`, `ptyService`, `requestId`, and the Automerge `repo` via the `context` object.
- **Functional Core**: Handlers should avoid complex logic; they should build a `TPortal` and call a controller from `@vibecanvas/core`.
- **WebSocket Multiplexing**: The server multiplexes oRPC (`/api`), Automerge (`/automerge`), and PTY attach sockets (`/api/pty/:ptyID/connect`) over the same Bun server instance.
- **HTTP File Serving**: Binary file blobs are served from DB-backed records under `/files/*` with immutable cache headers and `ETag` support.
- **Realtime Event Streams**: DB change events, filesystem watch streams, and notification streams are delivered through oRPC event handlers.

## Data Storage (XDG Base Directory Spec)

All persistent data follows the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/). Path resolution lives in `@vibecanvas/core/vibecanvas-config/fn.xdg-paths.ts`.

### Resolution priority
1. `VIBECANVAS_CONFIG` env var — all dirs point here (legacy/testing override)
2. Dev mode (`!isCompiled`) — `<monorepo-root>/local-volume/{data,config,state,cache}/`
3. Production — `$XDG_*_HOME/vibecanvas` or XDG defaults below

### Production layout

| XDG variable | Default | Path | Contents |
|---|---|---|---|
| `XDG_DATA_HOME` | `~/.local/share` | `~/.local/share/vibecanvas/` | `vibecanvas.sqlite` (main DB + Automerge CRDT data) |
| `XDG_CONFIG_HOME` | `~/.config` | `~/.config/vibecanvas/` | `config.json` (user prefs like autoupdate mode) |
| `XDG_STATE_HOME` | `~/.local/state` | `~/.local/state/vibecanvas/` | `autoupdate-state.json` |
| `XDG_CACHE_HOME` | `~/.cache` | `~/.cache/vibecanvas/` | `database-migrations-embedded/` (regeneratable) |

### Dev layout

```
<monorepo-root>/local-volume/
├── data/    vibecanvas.sqlite
├── config/  config.json
├── state/   autoupdate-state.json
└── cache/   database-migrations-embedded/
```

### Key files

- **`vibecanvas.sqlite`** — Single SQLite database holding Drizzle schema tables such as `canvas`, `filetrees`, `files`, and `automerge_repo_data`. Lives in `dataDir`.
- **`config.json`** — Optional user-created file with settings like `{ "autoupdate": true | false | "notify" }`. Lives in `configDir`.
- **`autoupdate-state.json`** — Tracks `lastCheckedAt` timestamp for the 24h update check interval. Lives in `stateDir`.
- **`database-migrations-embedded/`** — Extracted from the compiled binary at runtime so Drizzle's `migrate()` can read them from disk. Safe to delete; re-extracted on next startup. Lives in `cacheDir`.

### Usage in code

Callers use `txConfigPath()` which returns both legacy fields and the new `paths` object:
```ts
const [config, err] = txConfigPath({ fs: { existsSync, mkdirSync } });
config.paths.dataDir    // → sqlite, automerge
config.paths.configDir  // → config.json
config.paths.stateDir   // → ephemeral state files
config.paths.cacheDir   // → regeneratable cache
config.databasePath     // → shortcut to dataDir + /vibecanvas.sqlite
```

## Code Quirks (Project-Specific)

- **Filesystem tree endpoint contract**: `filesystem.files` returns a nested tree (`{ root, children[] }`) rather than flat rows. Each node uses `{ name, path, is_dir, children }`.
- **Depth safety guard**: `ctrlDirFiles` enforces bounded recursion via `max_depth` (default `5`) to avoid OOM on large roots like home directories containing heavy dependency trees.
- **Server-side filtering behavior**: `ctrlDirFiles` applies dotfile filtering and glob filtering during traversal; matching is done against reconstructed relative paths while walking.
- **Error transport style**: Directory handlers such as `filesystem.home`, `filesystem.list`, and `filesystem.files` return contract-safe error objects (`{ type, message }`) instead of throwing, because outputs are modeled as success/error unions.
- **Realtime DB event usage**: When APIs mutate DB rows intended for live SPA sync (e.g. `filetrees`), publish through `dbUpdatePublisher` so clients can react without polling.
- **Notification replay behavior**: `notification.events` immediately yields the latest global notification to newly connected subscribers before streaming future events.
- **Compiled-only port fallback**: In dev, the server binds exactly the requested port; in compiled builds, it retries up to 100 sequential ports starting from the preferred one.
- **PTY websocket attach contract**: Live terminal attach is not routed through `/api`; it is a dedicated websocket path that requires `workingDirectory` and optionally accepts `cursor` for replay.
