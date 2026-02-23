import { describe, test, expect } from "bun:test";
import { basename, join, resolve, sep } from "path";
import { mkdtempSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { ctrlFileMove } from "./ctrl.file-move";

const portal = {
  fs: {
    existsSync,
    statSync,
    renameSync,
  },
  path: {
    basename,
    join,
    resolve,
    sep,
  },
};

function withTempDir(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "vibecanvas-file-move-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("ctrlFileMove", () => {
  test("moves file into folder", () => {
    withTempDir((root) => {
      const sourceFile = join(root, "notes.txt");
      const destinationDir = join(root, "archive");

      writeFileSync(sourceFile, "hello");
      mkdirSync(destinationDir);

      const [result, error] = ctrlFileMove(portal, {
        source_path: sourceFile,
        destination_dir_path: destinationDir,
      });

      expect(error).toBeNull();
      expect(result?.moved).toBe(true);
      expect(existsSync(sourceFile)).toBe(false);
      expect(existsSync(join(destinationDir, "notes.txt"))).toBe(true);
    });
  });

  test("moves folder into folder", () => {
    withTempDir((root) => {
      const sourceDir = join(root, "src");
      const destinationDir = join(root, "packages");

      mkdirSync(sourceDir);
      writeFileSync(join(sourceDir, "index.ts"), "export {}");
      mkdirSync(destinationDir);

      const [result, error] = ctrlFileMove(portal, {
        source_path: sourceDir,
        destination_dir_path: destinationDir,
      });

      expect(error).toBeNull();
      expect(result?.moved).toBe(true);
      expect(existsSync(sourceDir)).toBe(false);
      expect(existsSync(join(destinationDir, "src"))).toBe(true);
      expect(existsSync(join(destinationDir, "src", "index.ts"))).toBe(true);
    });
  });

  test("rejects moving folder into descendant folder", () => {
    withTempDir((root) => {
      const sourceDir = join(root, "folder");
      const nestedDestination = join(sourceDir, "nested");

      mkdirSync(sourceDir);
      mkdirSync(nestedDestination);

      const [result, error] = ctrlFileMove(portal, {
        source_path: sourceDir,
        destination_dir_path: nestedDestination,
      });

      expect(result).toBeNull();
      expect(error?.code).toBe("CTRL.PROJECT_FS.FILE_MOVE.CANNOT_MOVE_INTO_DESCENDANT");
    });
  });

  test("rejects when destination already has same basename", () => {
    withTempDir((root) => {
      const sourceFile = join(root, "README.md");
      const destinationDir = join(root, "docs");

      writeFileSync(sourceFile, "source");
      mkdirSync(destinationDir);
      writeFileSync(join(destinationDir, "README.md"), "existing");

      const [result, error] = ctrlFileMove(portal, {
        source_path: sourceFile,
        destination_dir_path: destinationDir,
      });

      expect(result).toBeNull();
      expect(error?.code).toBe("CTRL.PROJECT_FS.FILE_MOVE.TARGET_EXISTS");
      expect(existsSync(sourceFile)).toBe(true);
    });
  });

  test("returns moved false when dropped into same parent", () => {
    withTempDir((root) => {
      const destinationDir = join(root, "project");
      const sourceFile = join(destinationDir, "main.ts");

      mkdirSync(destinationDir);
      writeFileSync(sourceFile, "console.log('ok')");

      const [result, error] = ctrlFileMove(portal, {
        source_path: sourceFile,
        destination_dir_path: destinationDir,
      });

      expect(error).toBeNull();
      expect(result?.moved).toBe(false);
      expect(existsSync(sourceFile)).toBe(true);
    });
  });
});
