import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const DartLspServerInfo: TLspServerInfo = {
  id: "dart",
  extensions: [".dart"],
  root: NearestRoot(["pubspec.yaml", "analysis_options.yaml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("dart");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["language-server", "--lsp"], projectRoot) };
  },
};
