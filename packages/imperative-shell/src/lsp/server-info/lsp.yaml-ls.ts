import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const YamlLsLspServerInfo: TLspServerInfo = {
  id: "yaml-ls",
  extensions: [".yaml", ".yml"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("yaml-language-server", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["yaml-language-server"]);
      if (!ok) return undefined;
      binary = maybeBin("yaml-language-server", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
