import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const KotlinLsLspServerInfo: TLspServerInfo = {
  id: "kotlin-ls",
  extensions: [".kt", ".kts"],
  root: async (filePath, stopDirectory) => {
    const settingsRoot = await NearestRoot(["settings.gradle.kts", "settings.gradle"])(filePath, stopDirectory);
    if (settingsRoot && settingsRoot !== stopDirectory) return settingsRoot;
    const wrapperRoot = await NearestRoot(["gradlew", "gradlew.bat"])(filePath, stopDirectory);
    if (wrapperRoot && wrapperRoot !== stopDirectory) return wrapperRoot;
    return NearestRoot(["build.gradle.kts", "build.gradle", "pom.xml"])(filePath, stopDirectory);
  },
  async spawn(projectRoot) {
    const binary = Bun.which("kotlin-lsp") ?? Bun.which("kotlin-language-server");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["--stdio"], projectRoot) };
  },
};
