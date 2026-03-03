import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const JuliaLsLspServerInfo: TLspServerInfo = {
  id: "julials",
  extensions: [".jl"],
  root: NearestRoot(["Project.toml", "Manifest.toml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("julia");
    if (!binary) return undefined;
    return {
      process: spawnProcess(binary, ["--startup-file=no", "--history-file=no", "-e", "using LanguageServer; runserver()"], projectRoot),
    };
  },
};
