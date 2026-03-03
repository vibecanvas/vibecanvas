import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const TyLspServerInfo: TLspServerInfo = {
  id: "ty",
  extensions: [".py", ".pyi"],
  root: NearestRoot(["pyproject.toml", "ty.toml", "setup.py", "setup.cfg", "requirements.txt", "Pipfile", "pyrightconfig.json"]),
  async spawn(projectRoot) {
    if (process.env["VIBECANVAS_EXPERIMENTAL_LSP_TY"] !== "1") return undefined;
    const binary = Bun.which("ty");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["server"], projectRoot) };
  },
};
