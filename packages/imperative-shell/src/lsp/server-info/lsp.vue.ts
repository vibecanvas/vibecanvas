import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const VueLspServerInfo: TLspServerInfo = {
  id: "vue",
  extensions: [".vue"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("vue-language-server", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["@vue/language-server"]);
      if (!ok) return undefined;
      binary = maybeBin("vue-language-server", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
