import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const AstroLspServerInfo: TLspServerInfo = {
  id: "astro",
  extensions: [".astro"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("astro-ls", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["@astrojs/language-server", "typescript"]);
      if (!ok) return undefined;
      binary = maybeBin("astro-ls", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
