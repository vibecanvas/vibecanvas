import { maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const EslintLspServerInfo: TLspServerInfo = {
  id: "eslint",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".vue"],
  root: NearestRoot(["package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock"]),
  async spawn(projectRoot, installDirectory) {
    const binary = maybeBin("vscode-eslint-language-server", installDirectory) ?? Bun.which("eslint-lsp");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
