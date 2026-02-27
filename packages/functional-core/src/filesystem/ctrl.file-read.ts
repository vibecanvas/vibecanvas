import { readFileSync, statSync } from "fs";
import { extname } from "path";
import { FilesystemErr } from "./err.codes";

type TPortal = {
  fs: {
    readFileSync: typeof readFileSync;
    statSync: typeof statSync;
  };
  path: {
    extname: typeof extname;
  };
};

type TArgs = {
  path: string;
  maxBytes?: number;
};

type TTextReadResult = {
  kind: "text";
  content: string;
  truncated: boolean;
};

type TBinaryReadResult = {
  kind: "binary";
  preview: string | null;
  size: number;
};

type TFileReadResult = TTextReadResult | TBinaryReadResult;

const DEFAULT_MAX_BYTES = 1024 * 512; // 512 KB
const BINARY_PREVIEW_BYTES = 256;

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html",
  ".xml", ".yaml", ".yml", ".toml", ".csv", ".svg", ".sh", ".py", ".rb",
  ".go", ".rs", ".c", ".cpp", ".h", ".java", ".kt", ".swift", ".sql",
  ".graphql", ".env", ".gitignore", ".dockerignore", ".editorconfig",
  ".log", ".ini", ".cfg", ".conf", ".properties", ".lock", ".prisma",
  ".astro", ".vue", ".svelte", ".hbs", ".ejs", ".pug", ".sass", ".scss",
  ".less", ".styl", ".lua", ".php", ".pl", ".r", ".m", ".mm",
]);

function isTextFile(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

export function ctrlFileRead(portal: TPortal, args: TArgs): TErrTuple<TFileReadResult> {
  const filePath = args.path;
  const maxBytes = args.maxBytes ?? DEFAULT_MAX_BYTES;

  let stats: ReturnType<typeof statSync>;
  try {
    stats = portal.fs.statSync(filePath);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      if ((err as { code: string }).code === "ENOENT") {
        return [null, { code: FilesystemErr.READ_NOT_FOUND, statusCode: 404, externalMessage: { en: "File not found" } }];
      }
      if ((err as { code: string }).code === "EACCES") {
        return [null, { code: FilesystemErr.READ_PERMISSION_DENIED, statusCode: 403, externalMessage: { en: "Permission denied" } }];
      }
    }
    return [null, { code: FilesystemErr.READ_FAILED, statusCode: 500, externalMessage: { en: "Failed to read file" } }];
  }

  const ext = portal.path.extname(filePath);

  if (!isTextFile(ext)) {
    try {
      const buf = portal.fs.readFileSync(filePath, { flag: "r" });
      const slice = buf.slice(0, BINARY_PREVIEW_BYTES);
      return [{
        kind: "binary",
        preview: slice.length > 0 ? Buffer.from(slice).toString("hex") : null,
        size: stats.size,
      }, null];
    } catch {
      return [null, { code: FilesystemErr.READ_FAILED, statusCode: 500, externalMessage: { en: "Failed to read file" } }];
    }
  }

  try {
    const buf = portal.fs.readFileSync(filePath, { flag: "r" });
    const truncated = buf.length > maxBytes;
    const slice = truncated ? buf.slice(0, maxBytes) : buf;
    const content = Buffer.from(slice).toString("utf-8");

    return [{
      kind: "text",
      content,
      truncated,
    }, null];
  } catch {
    return [null, { code: FilesystemErr.READ_FAILED, statusCode: 500, externalMessage: { en: "Failed to read file" } }];
  }
}
