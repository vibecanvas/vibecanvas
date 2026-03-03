import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const RubyLspServerInfo: TLspServerInfo = {
  id: "ruby-lsp",
  extensions: [".rb", ".rake", ".gemspec", ".ru"],
  root: NearestRoot(["Gemfile"]),
  async spawn(projectRoot) {
    const binary = Bun.which("rubocop") ?? Bun.which("ruby-lsp");
    if (!binary) return undefined;
    const args = binary.includes("rubocop") ? ["--lsp"] : [];
    return { process: spawnProcess(binary, args, projectRoot) };
  },
};
