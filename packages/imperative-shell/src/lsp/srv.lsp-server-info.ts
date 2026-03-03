import { existsSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, normalize, resolve, sep } from "node:path";

export type TLspLanguage = "typescript" | "python";

export type TLspServerHandle = {
  process: ChildProcessWithoutNullStreams;
  initialization?: Record<string, unknown>;
};

export type TRootFunction = (filePath: string, stopDirectory: string) => Promise<string | undefined>;

export type TLspServerInfo = {
  id: TLspLanguage;
  extensions: string[];
  root: TRootFunction;
  spawn: (projectRoot: string) => Promise<TLspServerHandle | undefined>;
};

export const NearestRoot = (includeMarkers: string[], excludeMarkers?: string[]): TRootFunction => {
  return async (filePath: string, stopDirectory: string) => {
    const normalizedStop = normalize(stopDirectory);
    const stopPrefix = normalizedStop.endsWith(sep) ? normalizedStop : `${normalizedStop}${sep}`;
    let current = dirname(normalize(filePath));

    while (true) {
      if (excludeMarkers && excludeMarkers.some((marker) => existsSync(resolve(current, marker)))) {
        return undefined;
      }

      if (includeMarkers.some((marker) => existsSync(resolve(current, marker)))) {
        return current;
      }

      if (current === normalizedStop) {
        return normalizedStop;
      }

      const parent = dirname(current);
      if (parent === current) {
        return normalizedStop;
      }

      if (parent !== normalizedStop && !parent.startsWith(stopPrefix)) {
        return normalizedStop;
      }

      current = parent;
    }
  };
};

export const LspServerInfoByLanguage: Record<TLspLanguage, TLspServerInfo> = {
  typescript: {
    id: "typescript",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    root: NearestRoot(
      ["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"],
      ["deno.json", "deno.jsonc"],
    ),
    async spawn(projectRoot: string) {
      const binary = Bun.which("typescript-language-server");
      if (!binary) return undefined;

      return {
        process: spawn(binary, ["--stdio"], {
          cwd: projectRoot,
          env: {
            ...process.env,
            BUN_BE_BUN: "1",
          },
        }),
      };
    },
  },
  python: {
    id: "python",
    extensions: [".py", ".pyi"],
    root: NearestRoot(["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", "Pipfile", "pyrightconfig.json"]),
    async spawn(projectRoot: string) {
      const binary = Bun.which("pyright-langserver");
      if (!binary) return undefined;

      return {
        process: spawn(binary, ["--stdio"], {
          cwd: projectRoot,
          env: {
            ...process.env,
            BUN_BE_BUN: "1",
          },
        }),
      };
    },
  },
};
