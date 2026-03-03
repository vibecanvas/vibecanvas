import { basename, extname } from "node:path";
import { LANGUAGE_EXTENSIONS } from "./language";
import { DenoLspServerInfo } from "./server-info/lsp.deno";
import { TypeScriptLspServerInfo } from "./server-info/lsp.typescript";
import { VueLspServerInfo } from "./server-info/lsp.vue";
import { EslintLspServerInfo } from "./server-info/lsp.eslint";
import { OxlintLspServerInfo } from "./server-info/lsp.oxlint";
import { BiomeLspServerInfo } from "./server-info/lsp.biome";
import { GoplsLspServerInfo } from "./server-info/lsp.gopls";
import { RubyLspServerInfo } from "./server-info/lsp.ruby-lsp";
import { TyLspServerInfo } from "./server-info/lsp.ty";
import { PythonLspServerInfo } from "./server-info/lsp.python";
import { ElixirLsLspServerInfo } from "./server-info/lsp.elixir-ls";
import { ZlsLspServerInfo } from "./server-info/lsp.zls";
import { CSharpLspServerInfo } from "./server-info/lsp.csharp";
import { FSharpLspServerInfo } from "./server-info/lsp.fsharp";
import { SourceKitLspServerInfo } from "./server-info/lsp.sourcekit-lsp";
import { RustLspServerInfo } from "./server-info/lsp.rust";
import { ClangdLspServerInfo } from "./server-info/lsp.clangd";
import { SvelteLspServerInfo } from "./server-info/lsp.svelte";
import { AstroLspServerInfo } from "./server-info/lsp.astro";
import { JdtlsLspServerInfo } from "./server-info/lsp.jdtls";
import { KotlinLsLspServerInfo } from "./server-info/lsp.kotlin-ls";
import { YamlLsLspServerInfo } from "./server-info/lsp.yaml-ls";
import { LuaLsLspServerInfo } from "./server-info/lsp.lua-ls";
import { PhpIntelephenseLspServerInfo } from "./server-info/lsp.php-intelephense";
import { PrismaLspServerInfo } from "./server-info/lsp.prisma";
import { DartLspServerInfo } from "./server-info/lsp.dart";
import { OcamlLspServerInfo } from "./server-info/lsp.ocaml-lsp";
import { BashLspServerInfo } from "./server-info/lsp.bash";
import { TerraformLspServerInfo } from "./server-info/lsp.terraform";
import { TexlabLspServerInfo } from "./server-info/lsp.texlab";
import { DockerfileLspServerInfo } from "./server-info/lsp.dockerfile";
import { GleamLspServerInfo } from "./server-info/lsp.gleam";
import { ClojureLspServerInfo } from "./server-info/lsp.clojure-lsp";
import { NixdLspServerInfo } from "./server-info/lsp.nixd";
import { TinymistLspServerInfo } from "./server-info/lsp.tinymist";
import { HaskellLanguageServerLspServerInfo } from "./server-info/lsp.haskell-language-server";
import { JuliaLsLspServerInfo } from "./server-info/lsp.julials";

export {
  NearestRoot,
  type TLspLanguage,
  type TLspServerHandle,
  type TRootFunction,
  type TLspServerInfo,
} from "./server-info/lsp.shared";

export const LspServerInfoByLanguage = {
  deno: DenoLspServerInfo,
  typescript: TypeScriptLspServerInfo,
  vue: VueLspServerInfo,
  eslint: EslintLspServerInfo,
  oxlint: OxlintLspServerInfo,
  biome: BiomeLspServerInfo,
  gopls: GoplsLspServerInfo,
  "ruby-lsp": RubyLspServerInfo,
  ty: TyLspServerInfo,
  python: PythonLspServerInfo,
  "elixir-ls": ElixirLsLspServerInfo,
  zls: ZlsLspServerInfo,
  csharp: CSharpLspServerInfo,
  fsharp: FSharpLspServerInfo,
  "sourcekit-lsp": SourceKitLspServerInfo,
  rust: RustLspServerInfo,
  clangd: ClangdLspServerInfo,
  svelte: SvelteLspServerInfo,
  astro: AstroLspServerInfo,
  jdtls: JdtlsLspServerInfo,
  "kotlin-ls": KotlinLsLspServerInfo,
  "yaml-ls": YamlLsLspServerInfo,
  "lua-ls": LuaLsLspServerInfo,
  "php-intelephense": PhpIntelephenseLspServerInfo,
  prisma: PrismaLspServerInfo,
  dart: DartLspServerInfo,
  "ocaml-lsp": OcamlLspServerInfo,
  bash: BashLspServerInfo,
  terraform: TerraformLspServerInfo,
  texlab: TexlabLspServerInfo,
  dockerfile: DockerfileLspServerInfo,
  gleam: GleamLspServerInfo,
  "clojure-lsp": ClojureLspServerInfo,
  nixd: NixdLspServerInfo,
  tinymist: TinymistLspServerInfo,
  "haskell-language-server": HaskellLanguageServerLspServerInfo,
  julials: JuliaLsLspServerInfo,
} as const;

const LANGUAGE_TO_LSP: Record<string, keyof typeof LspServerInfoByLanguage> = {
  typescript: "typescript",
  typescriptreact: "typescript",
  javascript: "typescript",
  javascriptreact: "typescript",
  vue: "vue",
  python: "python",
  go: "gopls",
  ruby: "ruby-lsp",
  elixir: "elixir-ls",
  zig: "zls",
  csharp: "csharp",
  fsharp: "fsharp",
  swift: "sourcekit-lsp",
  rust: "rust",
  c: "clangd",
  cpp: "clangd",
  svelte: "svelte",
  astro: "astro",
  java: "jdtls",
  kotlin: "kotlin-ls",
  yaml: "yaml-ls",
  lua: "lua-ls",
  php: "php-intelephense",
  prisma: "prisma",
  dart: "dart",
  ocaml: "ocaml-lsp",
  shellscript: "bash",
  terraform: "terraform",
  "terraform-vars": "terraform",
  dockerfile: "dockerfile",
  gleam: "gleam",
  clojure: "clojure-lsp",
  nix: "nixd",
  typst: "tinymist",
  haskell: "haskell-language-server",
  julia: "julials",
};

export function resolveLspLanguageFromPath(filePath: string): keyof typeof LspServerInfoByLanguage | null {
  const normalized = filePath.toLowerCase();
  const fileName = basename(normalized);
  const extension = extname(normalized);
  const languageKey = LANGUAGE_EXTENSIONS[extension] ?? LANGUAGE_EXTENSIONS[fileName] ?? null;
  if (!languageKey) return null;
  return LANGUAGE_TO_LSP[languageKey] ?? null;
}
