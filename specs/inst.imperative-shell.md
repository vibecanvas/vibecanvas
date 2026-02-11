---
description: You build imperative shell infrastructure in packages/imperative-shell
mode: subagent
---

# Imperative Shell

The imperative shell lives in `packages/imperative-shell/`. It contains all infrastructure that interacts with the outside world - databases, services, and cache.

```
packages/imperative-shell/
└── src/
    ├── db/                # Database connections and schemas
    │   ├── conn.main.ts
    │   ├── schema.main.ts
    │   └── migrations/
    ├── service/           # External service clients
    │   ├── auth.ts
    │   ├── email.ts
    │   └── storage.ts
    └── cache/             # Caching layer
        ├── redis.ts
        └── memory.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     IMPERATIVE SHELL                            │
│                  packages/imperative-shell/                     │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    src/db/    │  │ src/service/  │  │  src/cache/   │       │
│  │               │  │               │  │               │       │
│  │  • SQLite     │  │  • Auth       │  │  • Redis      │       │
│  │  • Postgres   │  │  • Email      │  │  • In-memory  │       │
│  │  • Drizzle    │  │  • Storage    │  │               │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Injected via TPortal
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FUNCTIONAL CORE                             │
│           (packages/functional-core - pure logic)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concept: TPortal

The imperative shell is injected into the functional core via `TPortal`. This is the **boundary** between pure and impure code.

```ts
// In the app (builds portal from shell)
import { mainDb } from "@vibecanvas/imperative-shell/db";
import { cache } from "@vibecanvas/imperative-shell/cache";

// Build the portal - this is where shell meets core
const portal = {
  db: mainDb,
  cache: cache,
  session: currentSession,
};

// Call functional core with portal
const [result, err] = await ctrlUserCreate(portal, args);
```

```ts
// In the functional core (consumer)
type TPortal = {
  db: typeof mainDb;
  cache: typeof cache;
  session: TSession | null;
};

async function ctrlUserCreate(portal: TPortal, args: TArgs) {
  // Use shell dependencies through portal
  const user = await portal.db.query.users.findFirst(...);
  await portal.cache.set(`user:${user.id}`, user);
}
```

---

## Database (`src/db/`)

### Connection Factory

```ts
// packages/imperative-shell/src/db/conn.main.ts
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema.main";

export type MainDb = BunSQLiteDatabase<typeof schema> & { $client: Database };

// Production database
export const mainDb: MainDb = drizzle(
  new Database("./data/main.db"),
  { schema }
);

// Testing database factory (in-memory)
export function createTestingMainDb(): MainDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  // Run migrations or seed
  return db;
}
```

### Schema

```ts
// packages/imperative-shell/src/db/schema.main.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Export Pattern

```ts
// packages/imperative-shell/src/db/index.ts
export { mainDb, createTestingMainDb, type MainDb } from "./conn.main";
export * as schema from "./schema.main";
```

---

## Services (`src/service/`)

### External API Clients

```ts
// packages/imperative-shell/src/service/email.ts
export interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

export const emailService: EmailService = {
  async send(to, subject, body) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_KEY}` },
      body: JSON.stringify({ to, subject, body }),
    });
  },
};

// For testing
export function createMockEmailService(): EmailService {
  const sent: Array<{ to: string; subject: string; body: string }> = [];
  return {
    async send(to, subject, body) {
      sent.push({ to, subject, body });
    },
    _sent: sent,
  };
}
```

### Using Services in Portal

```ts
// In app
import { emailService } from "@vibecanvas/imperative-shell/service";

const portal = {
  db: mainDb,
  email: emailService,
};

const [result, err] = await ctrlUserInvite(portal, { email: "user@example.com" });
```

### Export Pattern

```ts
// packages/imperative-shell/src/service/index.ts
export { emailService, createMockEmailService, type EmailService } from "./email";
export { authService, type AuthService } from "./auth";
export { storageService, type StorageService } from "./storage";
```

---

## Cache (`src/cache/`)

### Cache Interface

```ts
// packages/imperative-shell/src/cache/types.ts
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
```

### In-Memory Cache

```ts
// packages/imperative-shell/src/cache/memory.ts
import type { CacheService } from "./types";

export function createInMemoryCache(): CacheService {
  const store = new Map<string, { value: any; expires: number | null }>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expires && Date.now() > entry.expires) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, ttlSeconds?: number) {
      store.set(key, {
        value,
        expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

export const memoryCache = createInMemoryCache();
```

### Redis Cache

```ts
// packages/imperative-shell/src/cache/redis.ts
import type { CacheService } from "./types";

export function createRedisCache(connectionUrl: string): CacheService {
  // Redis implementation
  return {
    async get<T>(key: string): Promise<T | null> {
      // ...
    },
    async set<T>(key: string, value: T, ttlSeconds?: number) {
      // ...
    },
    async delete(key: string) {
      // ...
    },
  };
}
```

### Export Pattern

```ts
// packages/imperative-shell/src/cache/index.ts
export type { CacheService } from "./types";
export { memoryCache, createInMemoryCache } from "./memory";
export { createRedisCache } from "./redis";
```

---

## Package Exports

```ts
// packages/imperative-shell/src/index.ts
export * from "./db";
export * from "./service";
export * from "./cache";
```

Import in apps:
```ts
import { mainDb, createTestingMainDb } from "@vibecanvas/imperative-shell/db";
import { emailService } from "@vibecanvas/imperative-shell/service";
import { memoryCache } from "@vibecanvas/imperative-shell/cache";

// Or import all
import { mainDb, emailService, memoryCache } from "@vibecanvas/imperative-shell";
```

---

## Testing with Mock Shell

```ts
import { describe, test, expect } from "bun:test";
import ctrlUserCreate from "./ctrl.create-user";
import { createTestingMainDb } from "@vibecanvas/imperative-shell/db";
import { createMockEmailService } from "@vibecanvas/imperative-shell/service";
import { createInMemoryCache } from "@vibecanvas/imperative-shell/cache";

describe("ctrlUserCreate", () => {
  test("creates user and sends welcome email", async () => {
    // Create mock imperative shell
    const testDb = createTestingMainDb();
    const mockEmail = createMockEmailService();
    const testCache = createInMemoryCache();

    const portal = {
      db: testDb,
      email: mockEmail,
      cache: testCache,
    };

    const [result, error] = await ctrlUserCreate(portal, {
      name: "Test User",
      email: "test@example.com",
    });

    expect(error).toBeNull();
    expect(result?.id).toBeDefined();
    expect(mockEmail._sent).toHaveLength(1);
  });
});
```

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Database | `src/db/` | Drizzle connections, schemas, migrations |
| Services | `src/service/` | External API clients (auth, email, storage) |
| Cache | `src/cache/` | Redis, in-memory caching |

**Key Principles:**

1. **Shell is a package** - Lives in `packages/imperative-shell/`
2. **Inject via TPortal** - Never import shell directly in functional core
3. **Create factories for testing** - `createTestingMainDb()`, `createMockEmailService()`
4. **Keep shell thin** - Only connection/configuration code, no business logic
5. **Export types** - Always export interfaces for mocking
