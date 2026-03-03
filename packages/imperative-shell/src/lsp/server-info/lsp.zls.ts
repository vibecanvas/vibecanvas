import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const ZlsLspServerInfo: TLspServerInfo = {
  id: "zls",
  extensions: [".zig", ".zon"],
  root: NearestRoot(["build.zig"]),
  async spawn(projectRoot) {
    const binary = Bun.which("zls");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
