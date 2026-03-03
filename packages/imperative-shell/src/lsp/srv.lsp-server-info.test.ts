import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";
import { NearestRoot } from "./srv.lsp-server-info";

const tempDirs: string[] = [];

function createTempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "vibecanvas-lsp-root-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("NearestRoot", () => {
  test("returns nearest directory containing include marker", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const nested = join(projectRoot, "src", "feature");
    const filePath = join(nested, "index.ts");

    mkdirSync(nested, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(filePath, "", "utf8");

    const resolveRoot = NearestRoot(["package-lock.json"]);
    const result = await resolveRoot(filePath, workspace);

    expect(result).toBe(normalize(projectRoot));
  });

  test("returns undefined when exclude marker is found while traversing", async () => {
    const workspace = createTempWorkspace();
    const projectRoot = join(workspace, "project");
    const nested = join(projectRoot, "src");
    const filePath = join(nested, "index.ts");

    mkdirSync(nested, { recursive: true });
    writeFileSync(join(projectRoot, "package-lock.json"), "{}", "utf8");
    writeFileSync(join(projectRoot, "deno.json"), "{}", "utf8");
    writeFileSync(filePath, "", "utf8");

    const resolveRoot = NearestRoot(["package-lock.json"], ["deno.json"]);
    const result = await resolveRoot(filePath, workspace);

    expect(result).toBeUndefined();
  });

  test("returns stop directory when no marker is found", async () => {
    const workspace = createTempWorkspace();
    const nested = join(workspace, "a", "b", "c");
    const filePath = join(nested, "index.ts");

    mkdirSync(nested, { recursive: true });
    writeFileSync(filePath, "", "utf8");

    const resolveRoot = NearestRoot(["package-lock.json"]);
    const result = await resolveRoot(filePath, workspace);

    expect(result).toBe(normalize(workspace));
  });
});
