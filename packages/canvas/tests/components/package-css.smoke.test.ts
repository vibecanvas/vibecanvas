import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

async function readFilesRecursively(rootDir: string): Promise<Array<{ path: string; content: string }>> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const results: Array<{ path: string; content: string }> = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await readFilesRecursively(fullPath));
      continue;
    }

    const content = await readFile(fullPath, "utf8");
    results.push({ path: fullPath, content });
  }

  return results;
}

test("canvas package entry imports without app-side tailwind wiring", async () => {
  const entry = await import("../../src/index");

  expect(entry.Canvas).toBeTypeOf("function");
});

test("canvas components and package CSS do not carry tailwind-shaped source patterns", async () => {
  const packageRoot = path.resolve(import.meta.dirname, "../..");
  const legacyStylesPath = path.join(packageRoot, "src/styles.css");
  const baseStylesPath = path.join(packageRoot, "src/base.css");
  const componentsDir = path.join(packageRoot, "src/components");
  const baseStyles = await readFile(baseStylesPath, "utf8");
  const componentFiles = await readFilesRecursively(componentsDir);
  const cssFiles = componentFiles.filter((file) => file.path.endsWith(".css"));

  await expect(readFile(legacyStylesPath, "utf8")).rejects.toThrow();

  expect(baseStyles).not.toMatch(/\[class~=/);
  expect(baseStyles).not.toMatch(/\.md\\:/);
  expect(baseStyles).not.toMatch(/\.xl\\:/);
  expect(baseStyles).not.toMatch(/^\.(absolute|relative|fixed|flex|grid|inline-flex|block|w-full|h-full|min-h-0|min-w-0|text-xs|text-sm|p-\d|px-\d|py-\d|bg-[\w-]+|border(?:-[\w-]+)?|shadow(?:-[\w-]+)?|rounded(?:-[\w-]+)?)\s*\{/m);

  for (const file of cssFiles) {
    expect(file.content).not.toMatch(/\[class~=/);
    expect(file.content).not.toMatch(/\.md\\:/);
    expect(file.content).not.toMatch(/\.xl\\:/);
    expect(file.content).not.toMatch(/^\.(absolute|relative|fixed|flex|grid|inline-flex|block|w-full|h-full|min-h-0|min-w-0|text-xs|text-sm|p-\d|px-\d|py-\d|bg-[\w-]+|border(?:-[\w-]+)?|shadow(?:-[\w-]+)?|rounded(?:-[\w-]+)?)\s*\{/m);
  }

  const classAttributePattern = /\bclass\s*=\s*"([^"]+)"/g;
  const classListPattern = /classList\s*=\s*\{\{([\s\S]*?)\}\}/g;

  for (const file of componentFiles) {
    if (!file.path.endsWith(".tsx")) continue;

    for (const match of file.content.matchAll(classAttributePattern)) {
      const tokens = match[1].split(/\s+/).filter(Boolean);
      expect(tokens.every((token) => token.startsWith("vc-"))).toBe(true);
    }

    for (const match of file.content.matchAll(classListPattern)) {
      const keys = Array.from(match[1].matchAll(/"([^"]+)"\s*:/g), (result) => result[1]);
      expect(keys.every((token) => token.startsWith("vc-"))).toBe(true);
    }
  }
});
