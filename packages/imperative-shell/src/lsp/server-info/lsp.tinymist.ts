import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const TinymistLspServerInfo: TLspServerInfo = {
  id: "tinymist",
  extensions: [".typ", ".typc"],
  root: NearestRoot(["typst.toml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("tinymist");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
