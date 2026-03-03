import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const BiomeLspServerInfo: TLspServerInfo = {
  id: "biome",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".json", ".jsonc", ".vue", ".astro", ".svelte", ".css", ".graphql", ".gql", ".html"],
  root: NearestRoot(["biome.json", "biome.jsonc", "package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("biome", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["@biomejs/biome"]);
      if (!ok) return undefined;
      binary = maybeBin("biome", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["lsp-proxy", "--stdio"], projectRoot) };
  },
};
