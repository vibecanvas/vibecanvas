import { installNodePackages, maybeBin, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const DockerfileLspServerInfo: TLspServerInfo = {
  id: "dockerfile",
  extensions: [".dockerfile", "Dockerfile"],
  root: async (_filePath, stopDirectory) => stopDirectory,
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("docker-langserver", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["dockerfile-language-server-nodejs"]);
      if (!ok) return undefined;
      binary = maybeBin("docker-langserver", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
