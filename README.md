# Vibecanvas

Run your agents in an infinite canvas.

Vibecanvas is a Bun-based visual devtool that combines:
- a collaborative infinite canvas (SolidJS + PixiJS + Automerge CRDT),
- a typed realtime API layer (oRPC over WebSocket),
- and a local-first backend (Bun + SQLite + Drizzle).

The project is organized as a monorepo and follows a **Functional Core / Imperative Shell** architecture.

## Important: Claude Code First

Vibecanvas is built to work **on top of Claude Code CLI** and uses the **Anthropic Claude Agent SDK** under the hood.

Before using Vibecanvas, authenticate with Claude Code first.

```bash
claude auth login
```

You can use either:
- Claude subscription auth via Claude Code CLI, or
- Claude API keys,

but in both cases you should make sure Claude Code is already set up and authenticated on your machine.

## Features

- Infinite canvas UI for drawing, selecting, transforming, and grouping elements
- Real-time CRDT sync with Automerge for conflict-free collaboration
- Unified WebSocket API endpoint for app RPC (`/api`)
- Dedicated Automerge sync endpoint (`/automerge`)
- Built-in Claude agent integration and chat sessions
- Native binary distribution for macOS, Linux, and Windows
- Auto-update checks in the CLI/server runtime

## Quick Start

### Install globally

```bash
# bun
bun add -g vibecanvas

# npm
npm i -g vibecanvas

# pnpm
pnpm add -g vibecanvas

# yarn
yarn global add vibecanvas
```

Then run:

```bash
vibecanvas
```

### Uninstall

```bash
# bun
bun remove -g vibecanvas

# npm
npm uninstall -g vibecanvas

# pnpm
pnpm remove -g vibecanvas

# yarn
yarn global remove vibecanvas
```

If you installed using the install script (`curl ... | bash`) instead of a package manager, remove the installed files manually:

```bash
rm -f ~/.vibecanvas/bin/vibecanvas
rm -rf ~/.vibecanvas/database-migrations
```

Also remove any PATH line you added for `~/.vibecanvas/bin` in your shell profile (`~/.zshrc`, `~/.bashrc`, `~/.profile`, or fish config).

### 1) Install dependencies

```bash
bun install
```

### 2) Run in development

Run everything in parallel:

```bash
bun dev
```

Or run SPA and server separately:

```bash
bun client:dev
bun server:dev
```

### 3) Open the app

- SPA dev server: `http://localhost:3001`
- Server default port in runtime: `3000` (or `7496` in `server:prod` script)

## Monorepo Layout

```text
apps/
  server/       # Bun server + oRPC + websocket transport
  spa/          # SolidJS SPA + PixiJS canvas
  vibecanvas/   # npm wrapper package + binary launcher

packages/
  functional-core/   # Pure/business logic (ctrl.*, fn.*, fx.*, tx.*)
  imperative-shell/  # Infrastructure (database, websocket, agent runtime)
  core-contract/     # Shared typed API contracts

scripts/
  build.ts           # Multi-platform binary build pipeline
  test-binary.ts     # Validates compiled binary assets + WS endpoints
  publish-npm.ts     # Publish dist packages to npm
  release.ts         # Upload release assets with gh
```

## Architecture

Vibecanvas uses a layered architecture:

1. **Apps** (`apps/*`) wire UI/transport and dependency injection.
2. **Functional Core** (`packages/functional-core`) contains deterministic logic and orchestration.
3. **Imperative Shell** (`packages/imperative-shell`) contains side-effectful infrastructure.

Within the SPA canvas system, interactions follow a command-chain model:
- input commands process pointer/wheel/keyboard events,
- renderables apply visual changes and emit structured mutations,
- CRDT writes are committed at interaction boundaries.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** SolidJS, PixiJS, Tailwind v4, Kobalte
- **Sync:** Automerge + `@automerge/automerge-repo`
- **API:** oRPC over WebSocket
- **Database:** SQLite + Drizzle ORM
- **Typing/Validation:** TypeScript + Zod

## Common Commands

```bash
# Tests
bun test
bun --filter @vibecanvas/core test
bun --filter @vibecanvas/shell test

# Dev
bun dev
bun client:dev
bun server:dev
bun server:prod

# Build and binary validation
bun run scripts/build.ts
bun run scripts/build.ts --single
bun run scripts/test-binary.ts
```

Important: after a final build (`scripts/build.ts`), run `scripts/test-binary.ts` and ensure it passes.

## Database

- Primary local SQLite DB path: `~/.vibecanvas/vibecanvas.sqlite`
- Schema source: `packages/imperative-shell/src/database/`

## Local Storage

By default, Vibecanvas stores local runtime data in:

- `~/.vibecanvas/`

This folder is used for app state such as local database/config/runtime artifacts.

When schema changes:

```bash
cd packages/imperative-shell
bun run db:generate
bun run db:migrate
```

## Binary Distribution

The release pipeline builds platform-specific executables and a wrapper package:

- Build artifacts: `dist/`
- Manifest: `dist/release-manifest.json`
- Wrapper package: `apps/vibecanvas/`

Related scripts:
- `bun run scripts/build.ts`
- `bun run scripts/publish-npm.ts`
- `bun run scripts/release.ts`

## API / Transport Notes

- App RPC and chat share the `/api` WebSocket endpoint.
- Automerge document sync uses `/automerge`.
- Static/file assets are served by the server, with support for embedded assets in compiled binaries.

## Contributing

Contributions are welcome.

Recommended workflow:
1. Create a branch from `main`.
2. Make focused changes with tests.
3. Run relevant checks (`bun test`, package-specific tests, and build checks if needed).
4. Open a pull request with a clear summary.

For implementation conventions and deeper subsystem docs, read:
- `CLAUDE.md`
- `apps/spa/CLAUDE.md`
- `apps/spa/src/features/canvas-crdt/CLAUDE.md`
- `apps/spa/src/features/canvas-crdt/canvas/CLAUDE.md`
- `apps/spa/src/features/canvas-crdt/input-commands/CLAUDE.md`
- `apps/spa/src/features/canvas-crdt/managers/CLAUDE.md`
- `apps/spa/src/features/canvas-crdt/renderables/CLAUDE.md`

## License

MIT. See `LICENSE`.
