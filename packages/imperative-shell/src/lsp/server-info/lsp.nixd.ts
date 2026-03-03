import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const NixdLspServerInfo: TLspServerInfo = {
  id: "nixd",
  extensions: [".nix"],
  root: async (filePath, stopDirectory) => {
    const flakeRoot = await NearestRoot(["flake.nix"])(filePath, stopDirectory);
    return flakeRoot ?? stopDirectory;
  },
  async spawn(projectRoot) {
    const binary = Bun.which("nixd");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
