import { statSync } from "fs";
import { basename, extname } from "path";
import { FilesystemErr } from "./err.codes";

type TPortal = {
  fs: {
    statSync: typeof statSync;
  };
  path: {
    basename: typeof basename;
    extname: typeof extname;
  };
};

type TArgs = {
  path: string;
};

type TFileKind = "pdf" | "text" | "image" | "binary" | "video";

type TFileInspectResult = {
  name: string;
  path: string;
  mime: string | null;
  kind: TFileKind;
  size: number;
  lastModified: number;
};

const MIME_MAP: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
  ".jsx": "text/jsx",
  ".css": "text/css",
  ".html": "text/html",
  ".xml": "text/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".toml": "text/toml",
  ".csv": "text/csv",
  ".svg": "image/svg+xml",
  ".sh": "text/x-shellscript",
  ".py": "text/x-python",
  ".rb": "text/x-ruby",
  ".go": "text/x-go",
  ".rs": "text/x-rust",
  ".c": "text/x-c",
  ".cpp": "text/x-c++",
  ".h": "text/x-c",
  ".java": "text/x-java",
  ".kt": "text/x-kotlin",
  ".swift": "text/x-swift",
  ".sql": "text/x-sql",
  ".graphql": "text/x-graphql",
  ".env": "text/plain",
  ".gitignore": "text/plain",
  ".dockerignore": "text/plain",
  ".editorconfig": "text/plain",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".wasm": "application/wasm",
  ".exe": "application/x-executable",
};

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html",
  ".xml", ".yaml", ".yml", ".toml", ".csv", ".svg", ".sh", ".py", ".rb",
  ".go", ".rs", ".c", ".cpp", ".h", ".java", ".kt", ".swift", ".sql",
  ".graphql", ".env", ".gitignore", ".dockerignore", ".editorconfig",
  ".log", ".ini", ".cfg", ".conf", ".properties", ".lock", ".prisma",
  ".astro", ".vue", ".svelte", ".hbs", ".ejs", ".pug", ".sass", ".scss",
  ".less", ".styl", ".lua", ".php", ".pl", ".r", ".m", ".mm",
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

function classifyKind(ext: string): TFileKind {
  const lower = ext.toLowerCase();
  if (PDF_EXTENSIONS.has(lower)) return "pdf";
  if (TEXT_EXTENSIONS.has(lower)) return "text";
  if (IMAGE_EXTENSIONS.has(lower)) return "image";
  if (VIDEO_EXTENSIONS.has(lower)) return "video";
  return "binary";
}

function lookupMime(ext: string): string | null {
  return MIME_MAP[ext.toLowerCase()] ?? null;
}

export function ctrlFileInspect(portal: TPortal, args: TArgs): TErrTuple<TFileInspectResult> {
  const filePath = args.path;

  let stats: ReturnType<typeof statSync>;
  try {
    stats = portal.fs.statSync(filePath);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      if ((err as { code: string }).code === "ENOENT") {
        return [null, { code: FilesystemErr.INSPECT_NOT_FOUND, statusCode: 404, externalMessage: { en: "File not found" } }];
      }
      if ((err as { code: string }).code === "EACCES") {
        return [null, { code: FilesystemErr.INSPECT_PERMISSION_DENIED, statusCode: 403, externalMessage: { en: "Permission denied" } }];
      }
    }
    return [null, { code: FilesystemErr.INSPECT_FAILED, statusCode: 500, externalMessage: { en: "Failed to inspect file" } }];
  }

  const name = portal.path.basename(filePath);
  const ext = portal.path.extname(filePath);
  const mime = lookupMime(ext);
  const kind = classifyKind(ext);

  return [{
    name,
    path: filePath,
    mime,
    kind,
    size: stats.size,
    lastModified: stats.mtimeMs,
  }, null];
}
