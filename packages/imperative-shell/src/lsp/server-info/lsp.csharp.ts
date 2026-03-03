import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const CSharpLspServerInfo: TLspServerInfo = {
  id: "csharp",
  extensions: [".cs"],
  root: NearestRoot([".slnx", ".sln", ".csproj", "global.json"]),
  async spawn(projectRoot) {
    const binary = Bun.which("csharp-ls");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
