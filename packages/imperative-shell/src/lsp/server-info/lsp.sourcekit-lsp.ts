import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const SourceKitLspServerInfo: TLspServerInfo = {
  id: "sourcekit-lsp",
  extensions: [".swift", ".objc", ".objcpp"],
  root: NearestRoot(["Package.swift", ".xcodeproj", ".xcworkspace"]),
  async spawn(projectRoot) {
    const binary = Bun.which("sourcekit-lsp");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
