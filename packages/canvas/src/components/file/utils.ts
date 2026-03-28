import type { TFileData } from "@vibecanvas/shell/automerge/index";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function hexToBytes(content: string) {
  const normalized = content.trim();
  const size = Math.floor(normalized.length / 2);
  const bytes = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    const byte = normalized.slice(index * 2, index * 2 + 2);
    bytes[index] = Number.parseInt(byte, 16);
  }
  return bytes;
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export function getFileRenderer(path: string): TFileData["renderer"] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf":
      return "pdf";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "ico":
    case "bmp":
      return "image";
    case "mp4":
    case "webm":
    case "mov":
    case "avi":
    case "mkv":
      return "video";
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "aac":
      return "audio";
    case "md":
    case "mdx":
      return "markdown";
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "json":
    case "css":
    case "html":
    case "py":
    case "rs":
    case "go":
    case "java":
    case "c":
    case "cpp":
    case "h":
    case "rb":
    case "sh":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
    case "sql":
    case "graphql":
    case "vue":
    case "svelte":
    case "astro":
    case "zig":
    case "lua":
    case "swift":
    case "kt":
      return "code";
    case "txt":
    case "log":
    case "csv":
    case "env":
    case "gitignore":
    case "editorconfig":
      return "text";
    default:
      return "unknown";
  }
}

export function toDataUrlFromBinaryContent(args: {
  content: string | null;
  mime?: string | null;
  encoding?: "base64" | "hex";
  fallbackMime: string;
}) {
  if (!args.content) return null;
  if (args.content.startsWith("data:")) return args.content;

  const mime = args.mime ?? args.fallbackMime;
  if (args.encoding === "hex") {
    const base64 = bytesToBase64(hexToBytes(args.content));
    return `data:${mime};base64,${base64}`;
  }

  return `data:${mime};base64,${args.content}`;
}
