import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const GleamLspServerInfo: TLspServerInfo = {
  id: "gleam",
  extensions: [".gleam"],
  root: NearestRoot(["gleam.toml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("gleam");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["lsp"], projectRoot) };
  },
};
