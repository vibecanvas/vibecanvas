import { maybeBin, NearestRoot, installNodePackages, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const TypeScriptLspServerInfo: TLspServerInfo = {
  id: "typescript",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"], ["deno.json", "deno.jsonc"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("typescript-language-server", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["typescript-language-server", "typescript"]);
      if (!ok) return undefined;
      binary = maybeBin("typescript-language-server", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
