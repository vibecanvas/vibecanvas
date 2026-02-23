# Vibecanvas

Run your agents in an infinite drawing canvas.

Runs completly local. Reuses your llm subscriptions.

The project is organized as a monorepo and follows a **Functional Core / Imperative Shell** architecture.

## Important: OpenCode Required

Vibecanvas now runs agent sessions through **OpenCode**.

Before using Vibecanvas chat, install OpenCode globally:

```bash
# bun
bun add -g opencode-ai

# npm
npm i -g opencode-ai

# pnpm
pnpm add -g opencode-ai

# yarn
yarn global add opencode-ai
```

Then run `opencode` once and complete authentication/setup in the CLI.

## Features

- Infinite canvas UI for drawing, selecting, transforming, and grouping elements
- Real-time CRDT sync with Automerge for conflict-free collaboration
- Unified WebSocket API endpoint for app RPC (`/api`)
- Dedicated Automerge sync endpoint (`/automerge`)
- Built-in OpenCode agent integration and chat sessions
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

Open [http://localhost:7496](http://localhost:7496) to use the app.

### Upgrade vibecanvas

Vibecanvas includes a built-in upgrade command from the server CLI (`apps/server/src/main.ts`).

```bash
# check for updates and install
vibecanvas upgrade

# check only (no install)
vibecanvas upgrade --check
```

Useful related commands:

```bash
vibecanvas --version
vibecanvas --help
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
rm -rf ~/.vibecanvas
```

Also remove any PATH line you added for `~/.vibecanvas/bin` in your shell profile (`~/.zshrc`, `~/.bashrc`, `~/.profile`, or fish config).

## Database

- Primary local SQLite DB path: `~/.vibecanvas/vibecanvas.sqlite`
- Schema source: `packages/imperative-shell/src/database/`


## Contributing

Contributions are welcome.

**By submitting a pull request, you agree to transfer ownership of your contribution to the project maintainer.** This allows the project to be re-licensed or otherwise managed without needing to contact every individual contributor.

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
