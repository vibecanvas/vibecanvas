import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { exists } from "fs/promises";
import { fxProjectFsFileTree } from "./fx.file-tree";
import { ProjectFsErr } from "./err.codes";

function createMockSpawn(
  handler: (cmd: string[]) => { stdout: string; exitCode: number }
) {
  return (cmd: string[], _opts: { cwd: string; stdout: string }) => {
    const result = handler(cmd);
    return {
      stdout: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(result.stdout));
          controller.close();
        },
      }),
      exited: Promise.resolve(result.exitCode),
      exitCode: result.exitCode,
    };
  };
}

describe("fxProjectFsFileTree", () => {
  describe("with mocked portal", () => {
    test("returns files from git repo using git ls-files", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "git" && cmd[1] === "ls-files" && cmd.length === 2) {
              return { stdout: "src/index.ts\npackage.json\n", exitCode: 0 };
            }
            if (cmd[0] === "git" && cmd.includes("--others")) {
              return { stdout: "src/new-file.ts\n", exitCode: 0 };
            }
            return { stdout: "", exitCode: 1 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async (path: string) => {
            return path.endsWith(".git") || !path.includes("nonexistent");
          },
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(error).toBeNull();
      expect(result).not.toBeNull();
      expect(result!.files).toContain("src/index.ts");
      expect(result!.files).toContain("package.json");
      expect(result!.files).toContain("src/new-file.ts");
    });

    test("deduplicates files from tracked and untracked", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "git" && cmd[1] === "ls-files" && cmd.length === 2) {
              return { stdout: "file1.ts\nfile2.ts\n", exitCode: 0 };
            }
            if (cmd[0] === "git" && cmd.includes("--others")) {
              return { stdout: "file2.ts\nfile3.ts\n", exitCode: 0 };
            }
            return { stdout: "", exitCode: 1 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => true,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(error).toBeNull();
      expect(result!.files).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
    });

    test("sorts files alphabetically", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "git" && cmd[1] === "ls-files" && cmd.length === 2) {
              return { stdout: "z.ts\na.ts\nm.ts\n", exitCode: 0 };
            }
            if (cmd[0] === "git" && cmd.includes("--others")) {
              return { stdout: "", exitCode: 0 };
            }
            return { stdout: "", exitCode: 1 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => true,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(error).toBeNull();
      expect(result!.files).toEqual(["a.ts", "m.ts", "z.ts"]);
    });

    test("uses find command for non-git repos", async () => {
      let findCalled = false;

      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "find") {
              findCalled = true;
              return {
                stdout: "./src/index.ts\n./package.json\n",
                exitCode: 0,
              };
            }
            return { stdout: "", exitCode: 1 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async (path: string) => {
            // Project root exists, but .git doesn't
            return !path.endsWith(".git");
          },
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(error).toBeNull();
      expect(findCalled).toBe(true);
      expect(result!.files).toContain("src/index.ts");
      expect(result!.files).toContain("package.json");
    });

    test("strips ./ prefix from find results", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "find") {
              return {
                stdout: "./a.ts\n./b/c.ts\nd.ts\n",
                exitCode: 0,
              };
            }
            return { stdout: "", exitCode: 1 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async (path: string) => !path.endsWith(".git"),
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(error).toBeNull();
      expect(result!.files).toEqual(["a.ts", "b/c.ts", "d.ts"]);
    });

    test("returns error for non-existent project root", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn(() => ({ stdout: "", exitCode: 0 })) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => false,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/nonexistent/path",
      });

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe(ProjectFsErr.FILE_TREE_PATH_NOT_FOUND);
      expect(error!.statusCode).toBe(404);
    });

    test("returns error when git command fails", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn(() => ({ stdout: "", exitCode: 1 })) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => true,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe(ProjectFsErr.FILE_TREE_EXEC_FAILED);
      expect(error!.statusCode).toBe(500);
    });

    test("returns error when find command fails", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn((cmd) => {
            if (cmd[0] === "find") {
              return { stdout: "", exitCode: 1 };
            }
            return { stdout: "", exitCode: 0 };
          }) as typeof Bun.spawn,
        },
        fs: {
          exists: async (path: string) => !path.endsWith(".git"),
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/test/project",
      });

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe(ProjectFsErr.FILE_TREE_EXEC_FAILED);
    });

    test("handles empty file list", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn(() => ({ stdout: "", exitCode: 0 })) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => true,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/empty/project",
      });

      expect(error).toBeNull();
      expect(result!.files).toEqual([]);
    });

    test("includes projectRoot in result", async () => {
      const portal = {
        bun: {
          spawn: createMockSpawn(() => ({ stdout: "file.ts\n", exitCode: 0 })) as typeof Bun.spawn,
        },
        fs: {
          exists: async () => true,
        },
      };

      const [result, error] = await fxProjectFsFileTree(portal, {
        projectRoot: "/my/project/path",
      });

      expect(error).toBeNull();
      expect(result!.projectRoot).toBe("/my/project/path");
    });
  });

  describe("integration with real filesystem", () => {
    test("returns files from current git repo", async () => {
      const portal = {
        bun: { spawn: Bun.spawn },
        fs: { exists },
      };

      // Use the vibecanvas-refactor repo root
      const projectRoot = resolve(import.meta.dir, "../../../..");

      const [result, error] = await fxProjectFsFileTree(portal, { projectRoot });

      expect(error).toBeNull();
      expect(result).not.toBeNull();
      expect(result!.files.length).toBeGreaterThan(0);

      // Should include this test file
      expect(
        result!.files.some((f) =>
          f.includes("file/fx.file-tree.test.ts")
        )
      ).toBe(true);

      // Should not include node_modules
      expect(result!.files.some((f) => f.includes("node_modules"))).toBe(false);
    });
  });
});
