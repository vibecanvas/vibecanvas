# CLAUDE.md - Vibecanvas Development Guidelines

## Commands
- `bun test` - Run all tests
- `bun test <pattern>` - Run single test file
- `bun --filter @vibecanvas/core test` - Run tests for functional-core package
- `bun --filter @vibecanvas/shell test` - Run tests for imperative-shell package
- `bun client:dev` - Start SPA dev server on port 3001
- `bun server:dev` - Start server dev mode with HMR
- `bun server:prod` - Start server in production mode on port 3333
- `bun run scripts/test-binary.ts` - Validate compiled binary serves embedded assets and WS endpoints

**Final build requirement:**
- After every final build (`bun run scripts/build.ts` or `bun run scripts/build.ts --single`), run `bun run scripts/test-binary.ts` and ensure it passes.

## Database

Schema lives in `packages/imperative-shell/src/database/` using Drizzle ORM:
- `schema.ts` - Main schema
- `schema.drawing.ts` - Drawing-specific schema

**After modifying schema:**
```bash
cd packages/imperative-shell
bun run db:generate  # Generate migration SQL
bun run db:migrate   # Apply migrations
```

Database file: `~/.vibecanvas/vibecanvas.sqlite`

## Architecture

This is a Bun.js monorepo using the **Functional Core / Imperative Shell** pattern.

```
┌─────────────────────────────────────────────────────────────────┐
│                            APPS                                 │
│              @vibecanvas/server              @vibecanvas/spa                     │
│              apps/server/                    apps/spa/                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FUNCTIONAL CORE (@vibecanvas/core)                     │
│  packages/functional-core/                                      │
│  ├── canvas/       (Canvas CRUD operations)                     │
│  ├── chat/         (Chat operations)                            │
│  ├── drawing/      (Drawing operations)                         │
│  ├── filetree/     (File tree operations)                       │
│  ├── claude-agent/ (Claude AI integration)                      │
│  ├── project-fs/   (Project filesystem: dir-home, dir-list)     │
│  ├── vibecanvas-config/ (Config path operations)                │
│  └── ws/           (WebSocket operations)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ via TPortal
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IMPERATIVE SHELL (@vibecanvas/shell)                   │
│  packages/imperative-shell/                                     │
│  ├── database/     (Drizzle DB, schemas, migrations)            │
│  ├── claude-agent/ (Claude agent service)                       │
│  └── websocket/    (WebSocket implementation)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Apps (`apps/`)
- **Server** (`@vibecanvas/server`): `apps/server/src/apis/api.*.ts` - oRPC handlers and router wiring (`orpc.base.ts`, `api-router.ts`)
- **SPA** (`@vibecanvas/spa`): `apps/spa/` - SolidJS SPA with PixiJS canvas (see apps/spa/CLAUDE.md)

### Server Transport
- API calls use oRPC over a single WebSocket endpoint: `/api`
- Vibe chat and API RPC messages share the same `/api` WebSocket connection
- Automerge CRDT sync stays on its dedicated endpoint: `/automerge`

### Packages (`packages/`)
- **@vibecanvas/core** (`packages/functional-core`): Controllers and functions (ctrl.*, fn.*, fx.*, tx.*)
- **@vibecanvas/shell** (`packages/imperative-shell`): Infrastructure (database/, claude-agent/, websocket/)

## Code Style
- Use `fn.*` for pure functions, `fx.*` for effectful reads, `tx.*` for writes with rollback
- Always return `TErrTuple<T>` or `TErrTriple<T>` from functions
- Error codes: `PREFIX.MODULE.ERROR` (FN/FX/TX/CTRL/API)
- Import workspace packages: `@vibecanvas/core`, `@vibecanvas/shell`, `@vibecanvas/spa`, `@vibecanvas/server`
- No JSDoc unless explicitly requested
- Use `export default` for functions/controllers
- Test files: same path with `.test.ts` suffix

## Visual Development Context
This is a visual devtool for Bun.js codebases. Users communicate via wireframes, screenshots, and drawings. When implementing features, consider visual representation and how users will interact with the canvas-based interface.

## SPA Features (`apps/spa/src/features/`)
- **canvas/** - PixiJS canvas with input commands & renderables
  - `input-commands/` - 15+ command files (see input-commands/CLAUDE.md)
  - `renderables/` - Drawing shapes: rect, ellipse, diamond, etc. (see renderables/CLAUDE.md)
- **context-menu/** - Right-click context menu UI
- **drawings/** - Drawing state management
- **floating-drawing-toolbar/** - Tool selection toolbar
- **floating-selection-menu/** - Style editing menu for selected drawings
- **info-card/** - Information display component
- **sidebar/** - Canvas/project sidebar navigation
- **vibe-chat/** - Chat integration with Claude

## Documentation

### Sub-Documentation (CLAUDE.md files)
- `apps/spa/CLAUDE.md` - SPA-specific guide (SolidJS, Kobalte, Tailwind)
- `apps/spa/src/features/canvas/input-commands/CLAUDE.md` - Input command system
- `apps/spa/src/features/canvas/renderables/CLAUDE.md` - Renderable drawing system

### Third Party Documentation
@docs/pixi.llm.md
@docs/llm.bun.md

### Available Documentation Files
- **pixi/** - PixiJS library documentation (see @docs/pixi.llm.md for index)
- deployment-guide.md
- guide-npm-distribution.md
- llm.bun.md - Bun.js framework documentation
- llm.orpc.md - oRPC server and client documentation
- llm.automerge.md - Automerge transport and sync documentation
- llm.pixi.md - Canvas library

## Instructions

@instructions/inst.app.md
@instructions/inst.functional-core.md
@instructions/inst.imperative-shell.md

## Planning

When planning a new feature, follow these steps:

1. Write TOC with clickable links to sub sections
2. List the requirements and assumptions
3. Create a high-level overview
4. Break down the feature into smaller tasks
5. Show key changes -> don't implement whole feature. only the important parts
6. List all files to be created/modified
7. Update closest CLAUDE.md file (only if key ideas, skip when obvious)

End the Planning doc
With a diagram showing which data is changes.
Dev needs to understand data flow (most important)

List of file changes
