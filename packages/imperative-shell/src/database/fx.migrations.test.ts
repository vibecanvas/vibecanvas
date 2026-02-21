import { describe, expect, test } from "bun:test";
import { buildMigrationsFolderCandidates } from "./fx.migrations";

describe("buildMigrationsFolderCandidates", () => {
  test("omits source-tree fallback when compiled", () => {
    const configDir = "/tmp/vibecanvas-config";
    const sourceDir = "/build-server/workspace/vibecanvas/packages/imperative-shell/database-migrations";

    const candidates = buildMigrationsFolderCandidates(configDir, {
      isCompiled: true,
      envOverride: undefined,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-config/database-migrations-embedded",
      sourceDir,
    });

    expect(candidates).not.toContain(sourceDir);
    expect(candidates).toEqual([
      "/tmp/vibecanvas-config/database-migrations",
      "/usr/local/database-migrations",
      "/tmp/vibecanvas-config/database-migrations-embedded",
    ]);
  });

  test("keeps source-tree fallback in dev mode", () => {
    const configDir = "/tmp/vibecanvas-config";
    const sourceDir = "/repo/packages/imperative-shell/database-migrations";

    const candidates = buildMigrationsFolderCandidates(configDir, {
      isCompiled: false,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-config/database-migrations-embedded",
      sourceDir,
    });

    expect(candidates).toContain(sourceDir);
    expect(candidates[0]).toBe(sourceDir);
  });

  test("keeps env override at highest priority", () => {
    const configDir = "/tmp/vibecanvas-config";

    const candidates = buildMigrationsFolderCandidates(configDir, {
      envOverride: "/custom/migrations",
      isCompiled: true,
      execPath: "/usr/local/bin/bun",
      embeddedFolder: "/tmp/vibecanvas-config/database-migrations-embedded",
      sourceDir: "/repo/database-migrations",
    });

    expect(candidates[0]).toBe("/custom/migrations");
  });
});
