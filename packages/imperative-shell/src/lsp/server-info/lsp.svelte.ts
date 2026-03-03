import { installNodePackages, maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const SvelteLspServerInfo: TLspServerInfo = {
  id: "svelte",
  extensions: [".svelte"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    let binary = maybeBin("svelteserver", installDirectory);
    if (!binary) {
      const ok = await installNodePackages(installDirectory, ["svelte-language-server"]);
      if (!ok) return undefined;
      binary = maybeBin("svelteserver", installDirectory);
    }
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
