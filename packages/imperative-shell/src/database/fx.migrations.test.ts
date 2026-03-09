import { describe, expect, test } from "bun:test";
import { buildMigrationsFolderCandidates } from "./fx.migrations";

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
