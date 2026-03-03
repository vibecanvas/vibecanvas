import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const PhpIntelephenseLspServerInfo: TLspServerInfo = {
  id: "php-intelephense",
  extensions: [".php"],
  root: NearestRoot(["composer.json", "composer.lock", ".php-version"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("intelephense", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["intelephense"]);
      if (!ok) return undefined;
      binary = maybeBin("intelephense", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
