import { existsSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, join, normalize, resolve, sep } from "node:path";

export type TLspLanguage =
  | "deno"
  | "typescript"
  | "vue"
  | "eslint"
  | "oxlint"
  | "biome"
  | "gopls"
  | "ruby-lsp"
  | "ty"
  | "python"
  | "elixir-ls"
  | "zls"
  | "csharp"
  | "fsharp"
  | "sourcekit-lsp"
  | "rust"
  | "clangd"
  | "svelte"
  | "astro"
  | "jdtls"
  | "kotlin-ls"
  | "yaml-ls"
  | "lua-ls"
  | "php-intelephense"
  | "prisma"
  | "dart"
  | "ocaml-lsp"
  | "bash"
  | "terraform"
  | "texlab"
  | "dockerfile"
  | "gleam"
  | "clojure-lsp"
  | "nixd"
  | "tinymist"
  | "haskell-language-server"
  | "julials";

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

      if (current === normalizedStop) return normalizedStop;
      const parent = dirname(current);
      if (parent === current) return normalizedStop;
      if (parent !== normalizedStop && !parent.startsWith(stopPrefix)) return normalizedStop;
      current = parent;
    }
  };
};

export function isAutoInstallDisabled(): boolean {
  const value = process.env[DISABLE_LSP_DOWNLOAD_ENV];
  return value === "1" || value === "true";
}

export async function installNodePackages(installDirectory: string, packages: string[]): Promise<boolean> {
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

  return (await proc.exited) === 0;
}

export function resolveLocalBin(installDirectory: string, binaryName: string): string | null {
  const ext = process.platform === "win32" ? ".cmd" : "";
  const binaryPath = join(installDirectory, "node_modules", ".bin", `${binaryName}${ext}`);
  return existsSync(binaryPath) ? binaryPath : null;
}

export function resolveNodeEntrypoint(installDirectory: string, relativePath: string): string | null {
  const fullPath = join(installDirectory, "node_modules", ...relativePath.split("/"));
  return existsSync(fullPath) ? fullPath : null;
}

export function spawnProcess(command: string, args: string[], cwd: string): ChildProcessWithoutNullStreams {
  return spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      BUN_BE_BUN: "1",
    },
  });
}

export function maybeBin(name: string, installDirectory: string): string | null {
  return Bun.which(name) ?? resolveLocalBin(installDirectory, name);
}
