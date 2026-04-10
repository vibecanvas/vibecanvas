import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { RUNTIME_GLOBAL_BLOCK_NOTE, validateNoDirectRuntimeGlobals } from "./lib/runtime-global-usage";

type TEditInput = {
  path: string;
  edits: Array<{
    oldText: string;
    newText: string;
  }>;
};

type TWriteInput = {
  path: string;
  content: string;
};

type TDeclKind = "function" | "type" | "class" | "value";

const FX_FILE_RE = /^fx\..+\.ts$/;
const FX_TEST_FILE_RE = /^fx\..+\.test\.ts$/;
const ALLOWED_RUNTIME_IMPORT_RE = /^(fn|fx)\..+$/;
const FX_CHECK_RULES = [
  "ignore fx.*.test.ts files",
  "exported functions must start with fx",
  "imports must be type-only unless imported module leaf starts with fn. or fx.",
  "no direct use of runtime globals like window, fetch, Bun, process, console, globalThis",
  "do not export classes or other runtime values; only functions and types",
  "every fx* function must have exactly 2 params",
  "first param must be named portal and typed as TPortal*",
  "second param must be named args and typed as TArgs*",
  "TPortal may hold side effects and mutable services objects",
  "TArgs is usually serializable payload data",
  "fx is for impure reads; use brain and prefer tx for impure writes",
] as const;
function stripToolPathPrefix(filePath: string): string {
  return filePath.startsWith("@") ? filePath.slice(1) : filePath;
}

function resolveToolPath(cwd: string, filePath: string): string {
  return path.resolve(cwd, stripToolPathPrefix(filePath));
}

function isFxFilePath(filePath: string): boolean {
  const baseName = path.basename(stripToolPathPrefix(filePath));
  if (FX_TEST_FILE_RE.test(baseName)) return false;
  return FX_FILE_RE.test(baseName);
}

function getModuleLeaf(modulePath: string): string {
  const clean = modulePath.replace(/\\/g, "/").replace(/\.(cts|mts|ts|tsx|js|jsx)$/, "");
  const parts = clean.split("/").filter(Boolean);
  return parts.at(-1) ?? clean;
}

function isAllowedRuntimeImport(modulePath: string): boolean {
  return ALLOWED_RUNTIME_IMPORT_RE.test(getModuleLeaf(modulePath));
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function maskComments(content: string): string {
  let result = "";
  let index = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escape = false;

  while (index < content.length) {
    const char = content[index]!;
    const next = content[index + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += "\n";
      } else {
        result += " ";
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        result += "  ";
        inBlockComment = false;
        index += 2;
      } else {
        result += char === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate && char === "/" && next === "/") {
      result += "  ";
      inLineComment = true;
      index += 2;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate && char === "/" && next === "*") {
      result += "  ";
      inBlockComment = true;
      index += 2;
      continue;
    }

    result += char;

    if (escape) {
      escape = false;
      index += 1;
      continue;
    }

    if ((inSingle || inDouble || inTemplate) && char === "\\") {
      escape = true;
      index += 1;
      continue;
    }

    if (!inDouble && !inTemplate && char === "'") {
      inSingle = !inSingle;
      index += 1;
      continue;
    }

    if (!inSingle && !inTemplate && char === '"') {
      inDouble = !inDouble;
      index += 1;
      continue;
    }

    if (!inSingle && !inDouble && char === "`") {
      inTemplate = !inTemplate;
      index += 1;
      continue;
    }

    index += 1;
  }

  return result;
}

function maskCommentsAndStrings(content: string): string {
  const noComments = maskComments(content);
  let result = "";
  let index = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;

  while (index < noComments.length) {
    const char = noComments[index]!;

    if (!inSingle && !inDouble && !inTemplate) {
      if (char === "'") {
        inSingle = true;
        result += " ";
        index += 1;
        continue;
      }
      if (char === '"') {
        inDouble = true;
        result += " ";
        index += 1;
        continue;
      }
      if (char === "`") {
        inTemplate = true;
        result += " ";
        index += 1;
        continue;
      }

      result += char;
      index += 1;
      continue;
    }

    if (escape) {
      result += char === "\n" ? "\n" : " ";
      escape = false;
      index += 1;
      continue;
    }

    if (char === "\\") {
      result += " ";
      escape = true;
      index += 1;
      continue;
    }

    if (inSingle && char === "'") {
      inSingle = false;
      result += " ";
      index += 1;
      continue;
    }

    if (inDouble && char === '"') {
      inDouble = false;
      result += " ";
      index += 1;
      continue;
    }

    if (inTemplate && char === "`") {
      inTemplate = false;
      result += " ";
      index += 1;
      continue;
    }

    result += char === "\n" ? "\n" : " ";
    index += 1;
  }

  return result;
}

function splitNamedSpecifiers(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function validateImports(content: string): string[] {
  const errors: string[] = [];
  const clean = maskComments(content);
  const importRe = /(^|\n)\s*import\s+([\s\S]*?)\s+from\s+(['"])(.*?)\3\s*;?/g;

  for (const match of clean.matchAll(importRe)) {
    const clause = match[2]?.trim() ?? "";
    const modulePath = match[4] ?? "";
    const start = (match.index ?? 0) + (match[1]?.length ?? 0);
    const line = getLineNumber(clean, start);

    if (!clause || clause.startsWith("type ")) continue;
    if (isAllowedRuntimeImport(modulePath)) continue;

    const namedMatch = clause.match(/\{([\s\S]*)\}/);
    const beforeNamed = namedMatch ? clause.slice(0, namedMatch.index).replace(/,/g, "").trim() : clause;
    const hasDefaultImport = !!beforeNamed && !beforeNamed.startsWith("*");
    const hasNamespaceImport = /\*\s+as\s+[A-Za-z_$][\w$]*/.test(clause);

    if (hasDefaultImport) {
      errors.push(`line ${line}: runtime default import from \"${modulePath}\" not allowed in fx.*.ts`);
    }

    if (hasNamespaceImport) {
      errors.push(`line ${line}: runtime namespace import from \"${modulePath}\" not allowed in fx.*.ts`);
    }

    if (namedMatch) {
      for (const specifier of splitNamedSpecifiers(namedMatch[1] ?? "")) {
        if (specifier.startsWith("type ")) continue;
        const importedName = specifier.split(/\s+as\s+/i).at(-1) ?? specifier;
        errors.push(
          `line ${line}: runtime import \"${importedName.trim()}\" from \"${modulePath}\" not allowed in fx.*.ts`,
        );
      }
    }
  }

  return errors;
}

function collectDeclarationKinds(content: string): Map<string, TDeclKind> {
  const clean = maskCommentsAndStrings(content);
  const kinds = new Map<string, TDeclKind>();

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[2];
    if (name) kinds.set(name, "function");
  }

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[2];
    if (name) kinds.set(name, "class");
  }

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[2];
    if (name) kinds.set(name, "type");
  }

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?)(?=;|\n)/g)) {
    const name = match[2];
    const init = (match[3] ?? "").trim();
    if (!name) continue;
    const isFunction = /^(async\s+)?function\b/.test(init) || /^(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(init);
    kinds.set(name, isFunction ? "function" : "value");
  }

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[2];
    if (name) kinds.set(name, "value");
  }

  return kinds;
}

function validateExports(content: string): string[] {
  const errors: string[] = [];
  const clean = maskCommentsAndStrings(content);
  const kinds = collectDeclarationKinds(content);

  for (const match of clean.matchAll(/(^|\n)\s*export\s+class\s+([A-Za-z_$][\w$]*)\b/g)) {
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    errors.push(`line ${line}: exported classes not allowed in fx.*.ts`);
  }

  for (const match of clean.matchAll(/(^|\n)\s*export\s+enum\s+([A-Za-z_$][\w$]*)\b/g)) {
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    errors.push(`line ${line}: exported enum not allowed; export functions or types only`);
  }

  for (const match of clean.matchAll(/(^|\n)\s*export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[2] ?? "";
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    if (!name.startsWith("fx")) {
      errors.push(`line ${line}: exported function must start with fx`);
    }
  }

  for (const match of clean.matchAll(/(^|\n)\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?)(?=;|\n)/g)) {
    const name = match[2] ?? "";
    const init = (match[3] ?? "").trim();
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    const isFunction = /^(async\s+)?function\b/.test(init) || /^(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(init);

    if (!isFunction) {
      errors.push(`line ${line}: exported value \"${name}\" not allowed; export functions or types only`);
      continue;
    }

    if (!name.startsWith("fx")) {
      errors.push(`line ${line}: exported function must start with fx`);
    }
  }

  for (const match of clean.matchAll(/(^|\n)\s*export\s+default\s+(?!function\b)(?!class\b)/g)) {
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    errors.push(`line ${line}: export assignment not allowed in fx.*.ts`);
  }

  for (const match of clean.matchAll(/(^|\n)\s*export\s*\{([\s\S]*?)\}\s*(?:from\s+['"][^'"]+['"])?\s*;?/g)) {
    const body = match[2] ?? "";
    const line = getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0));
    const hasFrom = /\}\s*from\s+['"][^'"]+['"]/.test(match[0] ?? "");

    for (const specifier of splitNamedSpecifiers(body)) {
      if (specifier.startsWith("type ")) continue;

      const parts = specifier.replace(/^type\s+/, "").split(/\s+as\s+/i).map((part) => part.trim());
      const localName = parts[0] ?? "";
      const exportedName = parts.at(-1) ?? localName;

      if (hasFrom) {
        if (!exportedName.startsWith("fx")) {
          errors.push(`line ${line}: exported function must start with fx`);
        }
        continue;
      }

      const kind = kinds.get(localName);
      if (kind === "class") {
        errors.push(`line ${line}: exported classes not allowed in fx.*.ts`);
        continue;
      }
      if (kind === "value") {
        errors.push(`line ${line}: exported value \"${exportedName}\" not allowed; export functions or types only`);
        continue;
      }
      if (kind === "function" && !exportedName.startsWith("fx")) {
        errors.push(`line ${line}: exported function must start with fx`);
      }
    }
  }

  return errors;
}

function validateGlobals(content: string): string[] {
  return validateNoDirectRuntimeGlobals(content, "fx.*.ts");
}

function splitTopLevelParams(paramText: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let depthAngle = 0;

  for (let index = 0; index < paramText.length; index += 1) {
    const char = paramText[index]!;

    if (char === "," && depthParen === 0 && depthBrace === 0 && depthBracket === 0 && depthAngle === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;

    if (char === "(") depthParen += 1;
    if (char === ")") depthParen -= 1;
    if (char === "{") depthBrace += 1;
    if (char === "}") depthBrace -= 1;
    if (char === "[") depthBracket += 1;
    if (char === "]") depthBracket -= 1;
    if (char === "<") depthAngle += 1;
    if (char === ">") depthAngle -= 1;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.filter(Boolean);
}

function validateFxFunctionParams(content: string): string[] {
  const errors: string[] = [];
  const clean = maskCommentsAndStrings(content);
  const signatures: Array<{ name: string; params: string; line: number }> = [];

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+(fx[A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    signatures.push({
      name: match[2] ?? "",
      params: match[3] ?? "",
      line: getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0)),
    });
  }

  for (const match of clean.matchAll(/(^|\n)\s*(?:export\s+)?(?:const|let|var)\s+(fx[A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*)?\(([^)]*)\)\s*=>?/g)) {
    signatures.push({
      name: match[2] ?? "",
      params: match[3] ?? "",
      line: getLineNumber(clean, (match.index ?? 0) + (match[1]?.length ?? 0)),
    });
  }

  for (const signature of signatures) {
    const params = splitTopLevelParams(signature.params);
    if (params.length !== 2) {
      errors.push(`line ${signature.line}: ${signature.name} must have exactly 2 params: portal and args`);
      continue;
    }

    const [portalParam, argsParam] = params;
    const portalMatch = portalParam?.match(/^portal\??\s*:\s*([A-Za-z_$][\w$]*)/);
    const argsMatch = argsParam?.match(/^args\??\s*:\s*([A-Za-z_$][\w$]*)/);

    if (!portalMatch) {
      errors.push(`line ${signature.line}: ${signature.name} first param must be named portal and typed as TPortal*`);
    } else if (!portalMatch[1].startsWith("TPortal")) {
      errors.push(`line ${signature.line}: ${signature.name} first param type must start with TPortal`);
    }

    if (!argsMatch) {
      errors.push(`line ${signature.line}: ${signature.name} second param must be named args and typed as TArgs*`);
    } else if (!argsMatch[1].startsWith("TArgs")) {
      errors.push(`line ${signature.line}: ${signature.name} second param type must start with TArgs`);
    }
  }

  return errors;
}

function validateFxFileContent(filePath: string, content: string): string[] {
  return [
    ...validateImports(content),
    ...validateExports(content),
    ...validateGlobals(content),
    ...validateFxFunctionParams(content),
  ].map((error) => `${path.basename(filePath)}: ${error}`);
}

async function buildEditedContent(absolutePath: string, input: TEditInput): Promise<{ content?: string; error?: string }> {
  let original: string;

  try {
    original = await readFile(absolutePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `fx-check could not read file before edit: ${message}` };
  }

  const matches = input.edits.map((edit, index) => {
    const firstIndex = original.indexOf(edit.oldText);
    if (firstIndex === -1) {
      return { index, error: `edit ${index + 1}: oldText not found` };
    }

    const secondIndex = original.indexOf(edit.oldText, firstIndex + Math.max(1, edit.oldText.length));
    if (secondIndex !== -1) {
      return { index, error: `edit ${index + 1}: oldText is not unique` };
    }

    return {
      index,
      start: firstIndex,
      end: firstIndex + edit.oldText.length,
      newText: edit.newText,
    };
  });

  const failed = matches.find((match) => "error" in match);
  if (failed && "error" in failed) {
    return { error: `fx-check could not validate edit: ${failed.error}` };
  }

  const ranges = matches as Array<{ index: number; start: number; end: number; newText: string }>;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1]!.end > sorted[index]!.start) {
      return { error: "fx-check could not validate edit: edit ranges overlap" };
    }
  }

  let next = original;
  for (const range of [...sorted].sort((a, b) => b.start - a.start)) {
    next = next.slice(0, range.start) + range.newText + next.slice(range.end);
  }

  return { content: next };
}

function formatViolations(filePath: string, violations: string[]): string {
  return [
    `fx-check blocked ${filePath}`,
    "what went wrong:",
    ...violations.map((violation) => `- ${violation}`),
    RUNTIME_GLOBAL_BLOCK_NOTE,
    "rules:",
    ...FX_CHECK_RULES.map((rule) => `- ${rule}`),
  ].join("\n");
}

export default function fxCheckExtension(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt +
        `\n\n## fx-check\nWhen editing or writing any fx.*.ts file, obey these rules:\n${FX_CHECK_RULES.map((rule) => `- ${rule}`).join("\n")}\n`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") {
      return undefined;
    }

    const input = event.input as Partial<TWriteInput & TEditInput>;
    if (typeof input.path !== "string" || !isFxFilePath(input.path)) {
      return undefined;
    }

    const absolutePath = resolveToolPath(ctx.cwd, input.path);

    let nextContent: string | undefined;
    let buildError: string | undefined;

    if (event.toolName === "write") {
      if (typeof input.content !== "string") {
        return { block: true, reason: "fx-check could not validate write: missing content" };
      }
      nextContent = input.content;
    }

    if (event.toolName === "edit") {
      if (!Array.isArray(input.edits)) {
        return { block: true, reason: "fx-check could not validate edit: missing edits" };
      }
      const result = await buildEditedContent(absolutePath, input as TEditInput);
      nextContent = result.content;
      buildError = result.error;
    }

    if (buildError) {
      if (ctx.hasUI) {
        ctx.ui.notify(buildError, "warning");
      }
      return { block: true, reason: buildError };
    }

    if (typeof nextContent !== "string") {
      return { block: true, reason: "fx-check could not validate file content" };
    }

    const violations = validateFxFileContent(absolutePath, nextContent);
    if (violations.length === 0) {
      return undefined;
    }

    const reason = formatViolations(input.path, violations);
    if (ctx.hasUI) {
      ctx.ui.notify(`fx-check blocked ${input.path}`, "warning");
    }
    return { block: true, reason };
  });
}
