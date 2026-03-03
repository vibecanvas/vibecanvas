import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const TerraformLspServerInfo: TLspServerInfo = {
  id: "terraform",
  extensions: [".tf", ".tfvars"],
  root: NearestRoot([".terraform.lock.hcl", "terraform.tfstate"]),
  async spawn(projectRoot) {
    const binary = Bun.which("terraform-ls");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, ["serve"], projectRoot) };
  },
};
