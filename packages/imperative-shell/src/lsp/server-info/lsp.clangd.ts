import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const ClangdLspServerInfo: TLspServerInfo = {
  id: "clangd",
  extensions: [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx"],
  root: NearestRoot(["compile_commands.json", "compile_flags.txt", ".clangd", "CMakeLists.txt", "Makefile"]),
  async spawn(projectRoot) {
    const binary = Bun.which("clangd");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--background-index", "--clang-tidy"], projectRoot) };
  },
};
