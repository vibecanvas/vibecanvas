import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const RustLspServerInfo: TLspServerInfo = {
  id: "rust",
  extensions: [".rs"],
  root: NearestRoot(["Cargo.toml", "Cargo.lock"]),
  async spawn(projectRoot) {
    const binary = Bun.which("rust-analyzer");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
