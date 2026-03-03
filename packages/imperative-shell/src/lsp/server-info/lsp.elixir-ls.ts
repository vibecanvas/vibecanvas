import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const ElixirLsLspServerInfo: TLspServerInfo = {
  id: "elixir-ls",
  extensions: [".ex", ".exs"],
  root: NearestRoot(["mix.exs", "mix.lock"]),
  async spawn(projectRoot) {
    const binary = Bun.which("elixir-ls") ?? Bun.which("language_server.sh");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
