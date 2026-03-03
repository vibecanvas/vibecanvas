import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const FSharpLspServerInfo: TLspServerInfo = {
  id: "fsharp",
  extensions: [".fs", ".fsi", ".fsx", ".fsscript"],
  root: NearestRoot([".slnx", ".sln", ".fsproj", "global.json"]),
  async spawn(projectRoot) {
    const binary = Bun.which("fsautocomplete");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
