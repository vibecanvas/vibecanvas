import { spawn } from "node:child_process";
import { NearestRoot, type TLspServerInfo } from "./lsp.shared";

export const DenoLspServerInfo: TLspServerInfo = {
  id: "deno",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
  root: async (filePath, stopDirectory) => {
    const denoRoot = await NearestRoot(["deno.json", "deno.jsonc"])(filePath, stopDirectory);
    if (!denoRoot || denoRoot === stopDirectory) return undefined;
    return denoRoot;
  },
  async spawn(projectRoot) {
    const deno = Bun.which("deno");
    if (!deno) return undefined;
    return { process: spawn(deno, ["lsp"], { cwd: projectRoot }) };
  },
};
