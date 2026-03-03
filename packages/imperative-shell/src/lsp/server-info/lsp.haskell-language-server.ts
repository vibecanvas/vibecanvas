import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const HaskellLanguageServerLspServerInfo: TLspServerInfo = {
  id: "haskell-language-server",
  extensions: [".hs", ".lhs"],
  root: NearestRoot(["stack.yaml", "cabal.project", "hie.yaml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("haskell-language-server-wrapper");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--lsp"], projectRoot) };
  },
};
