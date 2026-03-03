import { join } from "node:path";
import { installNodePackages, NearestRoot, resolveNodeEntrypoint, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const PythonLspServerInfo: TLspServerInfo = {
  id: "python",
  extensions: [".py", ".pyi"],
  root: NearestRoot(["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", "Pipfile", "pyrightconfig.json"]),
  async spawn(projectRoot, installDirectory) {
    const globalBinary = Bun.which("pyright-langserver");
    if (globalBinary) {
      return { process: spawnProcess(globalBinary, ["--stdio"], projectRoot) };
    }

    let entry = resolveNodeEntrypoint(installDirectory, "pyright/dist/pyright-langserver.js");
    if (!entry) {
      const ok = await installNodePackages(installDirectory, ["pyright"]);
      if (!ok) return undefined;
      entry = resolveNodeEntrypoint(installDirectory, "pyright/dist/pyright-langserver.js");
    }
    if (!entry) return undefined;
    return { process: spawnProcess(process.execPath, ["run", join(entry), "--stdio"], projectRoot) };
  },
};
