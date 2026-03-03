import { isAutoInstallDisabled, NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";
import { join } from "node:path";

export const GoplsLspServerInfo: TLspServerInfo = {
  id: "gopls",
  extensions: [".go"],
  root: async (filePath, stopDirectory) => {
    const work = await NearestRoot(["go.work"])(filePath, stopDirectory);
    if (work && work !== stopDirectory) return work;
    return NearestRoot(["go.mod", "go.sum"])(filePath, stopDirectory);
  },
  async spawn(projectRoot, installDirectory) {
    const existing = Bun.which("gopls");
    if (existing) return { process: spawnProcess(existing, [], projectRoot) };
    if (isAutoInstallDisabled()) return undefined;
    if (!Bun.which("go")) return undefined;

    const proc = Bun.spawn(["go", "install", "golang.org/x/tools/gopls@latest"], {
      env: { ...process.env, GOBIN: installDirectory },
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    });
    if ((await proc.exited) !== 0) return undefined;
    const ext = process.platform === "win32" ? ".exe" : "";
    return { process: spawnProcess(join(installDirectory, `gopls${ext}`), [], projectRoot) };
  },
};
