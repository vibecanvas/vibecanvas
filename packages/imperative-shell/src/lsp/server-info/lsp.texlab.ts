import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const TexlabLspServerInfo: TLspServerInfo = {
  id: "texlab",
  extensions: [".tex", ".bib"],
  root: NearestRoot([".latexmkrc", "latexmkrc", ".texlabroot", "texlabroot"]),
  async spawn(projectRoot) {
    const binary = Bun.which("texlab");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
