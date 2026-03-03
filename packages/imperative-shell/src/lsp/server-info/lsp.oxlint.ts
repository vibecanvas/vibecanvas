import { maybeBin, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const OxlintLspServerInfo: TLspServerInfo = {
  id: "oxlint",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".vue", ".astro", ".svelte"],
  root: NearestRoot([".oxlintrc.json", "package-lock.json", "bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock", "package.json"]),
  async spawn(projectRoot, installDirectory) {
    const binary = maybeBin("oxlint", installDirectory) ?? maybeBin("oxc_language_server", installDirectory);
    if (!binary) return undefined;
    const args = binary.includes("oxlint") ? ["--lsp"] : [];
    return { process: spawnProcess(binary, args, projectRoot) };
  },
};
