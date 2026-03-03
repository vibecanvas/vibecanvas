import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const OcamlLspServerInfo: TLspServerInfo = {
  id: "ocaml-lsp",
  extensions: [".ml", ".mli"],
  root: NearestRoot(["dune-project", "dune-workspace", ".merlin", "opam"]),
  async spawn(projectRoot) {
    const binary = Bun.which("ocamllsp");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
