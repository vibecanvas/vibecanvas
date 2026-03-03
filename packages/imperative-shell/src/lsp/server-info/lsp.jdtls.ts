import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const JdtlsLspServerInfo: TLspServerInfo = {
  id: "jdtls",
  extensions: [".java"],
  root: NearestRoot(["pom.xml", "build.gradle", "build.gradle.kts", ".project", ".classpath"]),
  async spawn(projectRoot) {
    const binary = Bun.which("jdtls");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
