import { existsSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, join, normalize, resolve, sep } from "node:path";

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
  spawn: (projectRoot: string, installDirectory: string) => Promise<TLspServerHandle | undefined>;
};

const DISABLE_LSP_DOWNLOAD_ENV = "VIBECANVAS_DISABLE_LSP_DOWNLOAD";

function isAutoInstallDisabled(): boolean {
  const value = process.env[DISABLE_LSP_DOWNLOAD_ENV];
  return value === "1" || value === "true";
}

async function installNodePackages(installDirectory: string, packages: string[]): Promise<boolean> {
  if (isAutoInstallDisabled()) return false;

  const proc = Bun.spawn([process.execPath, "install", ...packages], {
    cwd: installDirectory,
    env: {
      ...process.env,
      BUN_BE_BUN: "1",
    },
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
  });

  const exitCode = await proc.exited;
  return exitCode === 0;
}

function resolveLocalBin(installDirectory: string, binaryName: string): string | null {
  const ext = process.platform === "win32" ? ".cmd" : "";
  const binaryPath = join(installDirectory, "node_modules", ".bin", `${binaryName}${ext}`);
  return existsSync(binaryPath) ? binaryPath : null;
}

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
    async spawn(projectRoot: string, installDirectory: string) {
      let binary = Bun.which("typescript-language-server") ?? resolveLocalBin(installDirectory, "typescript-language-server");
      if (!binary) {
        const installed = await installNodePackages(installDirectory, ["typescript-language-server", "typescript"]);
        if (!installed) return undefined;
        binary = resolveLocalBin(installDirectory, "typescript-language-server");
      }
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
    async spawn(projectRoot: string, installDirectory: string) {
      let binary = Bun.which("pyright-langserver");
      const args = ["--stdio"];

      if (!binary) {
        let pyrightEntrypoint = join(installDirectory, "node_modules", "pyright", "dist", "pyright-langserver.js");
        if (!existsSync(pyrightEntrypoint)) {
          const installed = await installNodePackages(installDirectory, ["pyright"]);
          if (!installed) return undefined;
          pyrightEntrypoint = join(installDirectory, "node_modules", "pyright", "dist", "pyright-langserver.js");
        }
        if (!existsSync(pyrightEntrypoint)) return undefined;
        binary = process.execPath;
        args.unshift("run", pyrightEntrypoint);
      }

      return {
        process: spawn(binary, args, {
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
