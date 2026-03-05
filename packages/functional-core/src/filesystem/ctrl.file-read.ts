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
  content?: "text" | "base64" | "binary" | "none";
};

type TTextReadResult = {
  kind: "text";
  content: string;
  truncated: boolean;
};

type TBinaryReadResult = {
  kind: "binary";
  content: string | null;
  size: number;
  mime?: string;
  encoding?: "base64" | "hex";
};

type TNoneReadResult = {
  kind: "none";
  size: number;
};

type TFileReadResult = TTextReadResult | TBinaryReadResult | TNoneReadResult;

const DEFAULT_MAX_BYTES = 1024 * 512; // 512 KB
const BINARY_PREVIEW_BYTES = 256;
const MAX_PDF_BASE64_BYTES = 10 * 1024 * 1024; // 10 MB

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html",
  ".xml", ".yaml", ".yml", ".toml", ".csv", ".svg", ".sh", ".py", ".rb",
  ".go", ".rs", ".c", ".cpp", ".h", ".java", ".kt", ".swift", ".sql",
  ".graphql", ".env", ".gitignore", ".dockerignore", ".editorconfig",
  ".log", ".ini", ".cfg", ".conf", ".properties", ".lock", ".prisma",
  ".astro", ".vue", ".svelte", ".hbs", ".ejs", ".pug", ".sass", ".scss",
  ".less", ".styl", ".lua", ".php", ".pl", ".r", ".m", ".mm",
]);

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".tiff",
]);

const PDF_EXTENSIONS = new Set([".pdf"]);

function isTextFile(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

function isImageFile(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

function isPdfFile(ext: string): boolean {
  return PDF_EXTENSIONS.has(ext.toLowerCase());
}

function getMimeType(ext: string): string {
  const extLower = ext.toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
    ".tiff": "image/tiff",
  };
  return mimeTypes[extLower] ?? "application/octet-stream";
}

export function ctrlFileRead(portal: TPortal, args: TArgs): TErrTuple<TFileReadResult> {
  const filePath = args.path;
  const maxBytes = args.maxBytes ?? DEFAULT_MAX_BYTES;
  const contentType = args.content ?? "binary";

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

  // Handle "none" - metadata only
  if (contentType === "none") {
    return [{ kind: "none", size: stats.size }, null];
  }

  const ext = portal.path.extname(filePath);

  if (contentType === "base64") {
    if (isPdfFile(ext) && stats.size > MAX_PDF_BASE64_BYTES) {
      return [{
        kind: "binary",
        content: null,
        size: stats.size,
        mime: "application/pdf",
        encoding: "base64",
      }, null];
    }

    if (!isImageFile(ext) && !isPdfFile(ext)) {
      return [{
        kind: "binary",
        content: null,
        size: stats.size,
      }, null];
    }
  }

  // Handle text files
  if (isTextFile(ext)) {
    // If explicitly requesting binary, return binary format
    if (contentType === "binary") {
      try {
        const buf = portal.fs.readFileSync(filePath, { flag: "r" });
        const slice = buf.slice(0, BINARY_PREVIEW_BYTES);
        return [{
          kind: "binary",
          content: slice.length > 0 ? Buffer.from(slice).toString("hex") : null,
          size: stats.size,
          encoding: "hex",
        }, null];
      } catch {
        return [null, { code: FilesystemErr.READ_FAILED, statusCode: 500, externalMessage: { en: "Failed to read file" } }];
      }
    }

    // Default: return text content
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

  // Handle binary files
  try {
    const buf = portal.fs.readFileSync(filePath, { flag: "r" });

    // Base64 content
    if (contentType === "base64") {
      // For images, return full base64 data URL
      if (isImageFile(ext)) {
        const mimeType = getMimeType(ext);
        const base64 = Buffer.from(buf).toString("base64");
        return [{
          kind: "binary",
          content: `data:${mimeType};base64,${base64}`,
          size: stats.size,
          mime: mimeType,
          encoding: "base64",
        }, null];
      }

      if (isPdfFile(ext)) {
        const base64 = Buffer.from(buf).toString("base64");
        return [{
          kind: "binary",
          content: base64,
          size: stats.size,
          mime: "application/pdf",
          encoding: "base64",
        }, null];
      }

      // For non-images, return null content
      return [{
        kind: "binary",
        content: null,
        size: stats.size,
      }, null];
    }

    // Binary content (hex string) - default for backward compatibility
    const slice = buf.slice(0, BINARY_PREVIEW_BYTES);
    return [{
      kind: "binary",
      content: slice.length > 0 ? Buffer.from(slice).toString("hex") : null,
      size: stats.size,
      encoding: "hex",
    }, null];
  } catch {
    return [null, { code: FilesystemErr.READ_FAILED, statusCode: 500, externalMessage: { en: "Failed to read file" } }];
  }
}
