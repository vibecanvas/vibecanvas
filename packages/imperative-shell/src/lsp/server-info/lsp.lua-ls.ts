import { NearestRoot, type TLspServerInfo, spawnProcess } from "./lsp.shared";

export const LuaLsLspServerInfo: TLspServerInfo = {
  id: "lua-ls",
  extensions: [".lua"],
  root: NearestRoot([".luarc.json", ".luarc.jsonc", ".luacheckrc", ".stylua.toml", "stylua.toml", "selene.toml", "selene.yml"]),
  async spawn(projectRoot) {
    const binary = Bun.which("lua-language-server");
    if (!binary) return undefined;
    return { process: spawnProcess(binary, [], projectRoot) };
  },
};
