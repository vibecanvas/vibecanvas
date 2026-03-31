import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  buildMigrationsFolderCandidates,
  readMigrationJournalEntries,
  shouldBootstrapLegacyMigrationState,
} from "./fx.migrations";

describe("buildMigrationsFolderCandidates", () => {
  test("omits source-tree fallback when compiled", () => {
    const dataDir = "/tmp/vibecanvas-data";
    const cacheDir = "/tmp/vibecanvas-cache";
    const sourceDir = "/build-server/workspace/vibecanvas/packages/imperative-shell/database-migrations";

    const candidates = buildMigrationsFolderCandidates(dataDir, cacheDir, {
      isCompiled: true,
      envOverride: undefined,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-cache/database-migrations-embedded",
      sourceDir,
    });

    expect(candidates).not.toContain(sourceDir);
    expect(candidates).toEqual([
      "/tmp/vibecanvas-data/database-migrations",
      "/usr/local/database-migrations",
      "/tmp/vibecanvas-cache/database-migrations-embedded",
    ]);
  });

  test("keeps source-tree fallback in dev mode", () => {
    const dataDir = "/tmp/vibecanvas-data";
    const cacheDir = "/tmp/vibecanvas-cache";
    const sourceDir = "/repo/packages/imperative-shell/database-migrations";

    const candidates = buildMigrationsFolderCandidates(dataDir, cacheDir, {
      isCompiled: false,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-cache/database-migrations-embedded",
      sourceDir,
    });

    expect(candidates).toContain(sourceDir);
    expect(candidates[0]).toBe(sourceDir);
  });

  test("keeps env override at highest priority", () => {
    const dataDir = "/tmp/vibecanvas-data";
    const cacheDir = "/tmp/vibecanvas-cache";

    const candidates = buildMigrationsFolderCandidates(dataDir, cacheDir, {
      envOverride: "/custom/migrations",
      isCompiled: true,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-cache/database-migrations-embedded",
      sourceDir: "/repo/database-migrations",
    });

    expect(candidates[0]).toBe("/custom/migrations");
  });
});

describe("readMigrationJournalEntries", () => {
  test("reads drizzle journal entries from a migrations folder", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibecanvas-migrations-"));

    try {
      mkdirSync(join(tempDir, "meta"), { recursive: true });
      writeFileSync(
        join(tempDir, "meta", "_journal.json"),
        JSON.stringify({
          entries: [{ idx: 0, when: 123, tag: "0000_test", breakpoints: true }],
        }),
      );

      expect(readMigrationJournalEntries(tempDir)).toEqual([
        { idx: 0, when: 123, tag: "0000_test", breakpoints: true },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("shouldBootstrapLegacyMigrationState", () => {
  test("returns true when legacy tables exist without drizzle journal", () => {
    const tables = new Set(["automerge_repo_data", "canvas", "chats", "files", "filetrees"]);
    const sqlite = {
      query: () => ({
        get: (tableName: string) => (tables.has(tableName) ? { name: tableName } : null),
      }),
    };

    expect(shouldBootstrapLegacyMigrationState(sqlite)).toBe(true);
  });

  test("returns false when drizzle journal table already exists", () => {
    const tables = new Set(["__drizzle_migrations", "automerge_repo_data", "canvas", "chats", "files", "filetrees"]);
    const sqlite = {
      query: () => ({
        get: (tableName: string) => (tables.has(tableName) ? { name: tableName } : null),
      }),
    };

    expect(shouldBootstrapLegacyMigrationState(sqlite)).toBe(false);
  });
});
