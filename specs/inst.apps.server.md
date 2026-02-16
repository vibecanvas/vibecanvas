---
description: Specifics for the Orchestration Server in apps/server/
mode: subagent
---

# Apps: Server

The Server is the orchestration layer of Vibecanvas. It runs locally on the user's machine and acts as the bridge between the frontend (SPA) and the system (Files, Agents, Database).

## Tech Stack

- **Bun**: Runtime and package manager.
- **oRPC**: Framework for type-safe APIs over WebSockets.
- **Automerge Repo**: Handles CRDT synchronization and storage.
- **Drizzle ORM**: SQLite database management.
- **Claude Agent SDK**: For running AI agents.

## Key Responsibilities

### 1. API Orchestration (`src/apis`)
The server implements the contract defined in `@vibecanvas/core-contract`.
- **Canvas APIs**: CRUD for canvases and their metadata.
- **Agent APIs**: Initializing sessions and prompting AI agents.
- **Filesystem APIs**: Listing directories and reading/writing files in the project.
- **Database Events**: Streaming updates to the SPA when records change.

### 2. Automerge Host
The server provides the persistence layer for the CRDT documents.
- **Storage**: Maps Automerge URLs to rows in the SQLite database.
- **Network Bridge**: Forwards binary changes between multiple connected SPA instances (if applicable).

### 3. Agent Management
- **Runtime Discovery**: Automatically detects available Claude installations.
- **Session Lifecycle**: Spawns agent processes and handles message routing between the agent and the canvas.

### 4. Production Hosting
In compiled mode, the server:
- Embeds the SPA assets (via `embedded-assets.ts`).
- Provides an all-in-one executable for the user.
- Handles port resolution (falling back to alternative ports if `7496` is busy).

## Directory Structure

- `src/main.ts`: CLI entry point (handles `serve`, `upgrade` commands).
- `src/server.ts`: The core `Bun.serve` implementation.
- `src/api-router.ts`: Wiring of all oRPC handlers.
- `src/apis/`: Individual API implementations.
- `src/update/`: Logic for the self-update mechanism.

## Integration Patterns

- **Context Injection**: Every oRPC request has access to the Drizzle database instance via the `context` object.
- **Functional Core**: Handlers should avoid complex logic; they should build a `TPortal` and call a controller from `@vibecanvas/core`.
- **WebSocket Multiplexing**: Both oRPC and Automerge use specific paths (`/api` and `/automerge`) over the same server instance.

## Code Quirks (Project-Specific)

- **Filesystem tree endpoint contract**: `project.dir.files` returns a nested tree (`{ root, children[] }`) rather than flat rows. Each node uses `{ name, path, is_dir, children }`.
- **Depth safety guard**: `ctrlDirFiles` enforces bounded recursion via `max_depth` (default `5`) to avoid OOM on large roots like home directories containing heavy dependency trees.
- **Server-side filtering behavior**: `ctrlDirFiles` applies dotfile filtering and glob filtering during traversal; matching is done against reconstructed relative paths while walking.
- **Error transport style**: Directory handlers (`project.dir.home/list/files`) return contract-safe error objects (`{ type, message }`) instead of throwing, because outputs are modeled as success/error unions.
- **Realtime DB event usage**: When APIs mutate DB rows intended for live SPA sync (e.g. `filetrees`), publish through `dbUpdatePublisher` so clients can react without polling.
