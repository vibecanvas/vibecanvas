import { installNodePackages, maybeBin, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const BashLspServerInfo: TLspServerInfo = {
  id: "bash",
  extensions: [".sh", ".bash", ".zsh", ".ksh"],
  root: async (_filePath, stopDirectory) => stopDirectory,
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("bash-language-server", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["bash-language-server"]);
      if (!ok) return undefined;
      binary = maybeBin("bash-language-server", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["start"], projectRoot) };
  },
};
