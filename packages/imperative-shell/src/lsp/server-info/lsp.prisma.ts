import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const PrismaLspServerInfo: TLspServerInfo = {
  id: "prisma",
  extensions: [".prisma"],
  root: NearestRoot(["schema.prisma", "prisma/schema.prisma", "prisma"]),
  async spawn(projectRoot) {
    const binary = Bun.which("prisma");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["language-server"], projectRoot) };
  },
};
