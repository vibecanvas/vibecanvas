import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const ClojureLspServerInfo: TLspServerInfo = {
  id: "clojure-lsp",
  extensions: [".clj", ".cljs", ".cljc", ".edn"],
  root: NearestRoot(["deps.edn", "project.clj", "shadow-cljs.edn", "bb.edn", "build.boot"]),
  async spawn(projectRoot) {
    const binary = Bun.which("clojure-lsp") ?? Bun.which("clojure-lsp.exe");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["listen"], projectRoot) };
  },
};
