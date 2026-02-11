---
description: You build deployable applications in apps/
mode: subagent
---

# Apps

Deployable applications live in `apps/`. Each app is a thin layer that wires together the functional core with the imperative shell.

```
apps/
├── vibecanvas/  # Command-line interface
├── server/    # HTTP API server (Elysia)
└── spa/       # React SPA frontend
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                            APPS                                 │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │VIBECANVAS │     │   SERVER  │     │    SPA    │             │
│  └─────┬─────┘     └─────┬─────┘     └─────┬─────┘             │
└────────┼─────────────────┼─────────────────┼────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FUNCTIONAL CORE                             │
│  packages/functional-core/                                      │
│  └── CTRLS → FNS / FXS / TXS                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ via TPortal
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IMPERATIVE SHELL                            │
│  packages/imperative-shell/                                     │
│  ├── src/db/       │  src/service/  │  src/cache/              │
└─────────────────────────────────────────────────────────────────┘
```

Apps are responsible for:
- Importing from `@vibecanvas/shell` (db, services, cache)
- Building portals with dependencies (including transaction objects when atomicity is needed)
- Calling controllers from `@vibecanvas/core`
- Presenting results to users (terminal output, HTTP responses, UI)

---

## CLI (`apps/vibecanvas/`)

Command-line interface for terminal interactions.

### Structure

```
apps/vibecanvas/
├── src/
│   ├── index.ts              # Entry point, command routing
│   └── commands/
│       └── cmd.<name>.ts     # Individual commands
└── package.json
```

### Command Pattern

```ts
// apps/vibecanvas/src/commands/cmd.init.ts
import { mkdir, writeFile, rm } from "fs/promises";
import { ctrlProjectInit } from "@vibecanvas/core";

export async function init(targetPath: string) {
  console.log(`\nInitializing project...\n`);

  // Build portal with imperative shell dependencies
  const portal = {
    fs: { mkdir, writeFile, rm },
  };

  // Call controller
  const [result, err] = await ctrlProjectInit(portal, { targetPath });

  if (err) {
    const message = err.externalMessage?.en ?? err.code;
    throw new Error(message);
  }

  // Format output for terminal
  console.log("Created structure:");
  console.log(`  ${result.projectName}/`);
}
```

### Entry Point

```ts
// apps/vibecanvas/src/index.ts
#!/usr/bin/env bun
import { parseArgs } from "util";
import { init } from "./commands/cmd.init";

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    strict: false,
    allowPositionals: true,
  });

  const args = positionals.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      await init(args[1]);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
```

### CLI Responsibilities

**DO:**
- Parse command-line arguments
- Build portals with file system, network, or other dependencies
- Call controllers from `@vibecanvas/core`
- Format output for terminal display
- Handle process exit codes

**DON'T:**
- Contain business logic (use controllers)
- Make direct database calls (use controllers → functions)
- Import from functions directly (use controllers)

---

## Server (`apps/server/`)

HTTP API server using Elysia.

### Structure

```
apps/server/
├── server.ts              # Main entry, creates app
├── api-router.ts          # Combines all API routes
└── src/
    ├── api/               # API handlers
    │   └── <module>/
    │       └── api.<name>.ts
    └── plugins/           # Elysia plugins (auth, etc.)
```

### API Handler Pattern

```ts
// apps/server/src/api/project/api.project.ts
import { Elysia, t } from 'elysia';
import { ctrlProjectInit } from '@vibecanvas/core';
import { mainDb } from '@vibecanvas/shell/db';
import { mkdir, writeFile, rm } from 'fs/promises';

export default new Elysia({ prefix: '/api/project' })
  .post('/init', async ({ body, set }) => {
    // Build portal with imperative shell dependencies
    const portal = {
      db: mainDb,
      fs: { mkdir, writeFile, rm },
    };

    // Call controller
    const [result, error] = await ctrlProjectInit(portal, body);

    if (error) {
      set.status = error.statusCode;
      return { error: error.externalMessage?.en ?? error.code };
    }

    set.status = 201;
    return result;
  }, {
    body: t.Object({
      targetPath: t.String(),
    }),
  });
```

### Server Responsibilities

**DO:**
- Handle HTTP concerns (validation, auth, status codes)
- Build portals with database connections, services, external clients
- Call controllers from `@vibecanvas/core`
- Return appropriate HTTP responses
- Map `TErrorEntry.statusCode` to HTTP status

**DON'T:**
- Contain business logic (use controllers)
- Perform database operations directly (use functions)
- Export business types (use `@vibecanvas/core-contract`)
- Expose internal error details to clients (use `externalMessage`)

---

## Web (`apps/spa/`)

React SPA with file-based routing.

### Structure

```
apps/spa/
├── pages/                 # Auto-discovered page components
│   ├── index.tsx          # /
│   ├── about.tsx          # /about
│   └── [slug].tsx         # /:slug (dynamic)
├── features/              # Feature modules
├── client-router.tsx      # Client-side routing
├── eden.ts                # Type-safe API client
├── styles.css             # Global styles
└── index.html             # SPA entry
```

### Page Pattern

```tsx
// apps/spa/pages/about.tsx
import type { PageMeta } from "@vibecanvas/core-contract";

export const meta: PageMeta = {
  title: "About - App",
  description: "About page description.",
};

export default function AboutPage() {
  return (
    <div>
      <h1>About</h1>
    </div>
  );
}
```

### API Calls with Eden

```tsx
import { api } from "../eden.ts";

async function createProject(targetPath: string) {
  const { data, error } = await api.api.project.init.post({
    targetPath,
  });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Created:", data.projectName);
}
```

### Web Responsibilities

**DO:**
- Present UI to users
- Handle user interactions
- Call server API via Eden
- Manage client-side state

**DON'T:**
- Contain business logic (server-side)
- Import from `@vibecanvas/core` (browser can't run server code)
- Make direct database calls

---

## Testing Apps

```bash
# CLI
bun run apps/vibecanvas/src/index.ts --help
bun run apps/vibecanvas/src/index.ts init /tmp/test

# Server
bun apps/server/server.ts
curl http://localhost:3000/api/health

# Web (served by server)
open http://localhost:3000
```

---

## Adding New Features

1. **Define data structures** in `@vibecanvas/core-contract`
2. **Add infrastructure** in `@vibecanvas/shell` (db schemas, services, cache)
3. **Implement functions** in `@vibecanvas/core` (fn/fx/tx)
4. **Create controller** in `@vibecanvas/core` (ctrl)
5. **Wire up in app:**
   - CLI: Add command in `apps/vibecanvas/src/commands/`
   - Server: Add API handler in `apps/server/src/api/`
   - Web: Add page/feature in `apps/spa/`
