const formatToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const extensionToFormat = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
} as const;

export type TImageFormat = typeof extensionToFormat[keyof typeof extensionToFormat];

export function extensionFromFormat(format: keyof typeof formatToExtension): string {
  return formatToExtension[format];
}

export function formatFromExtension(extension: string): TImageFormat | null {
  return extensionToFormat[extension.toLowerCase() as keyof typeof extensionToFormat] ?? null;
}

export function toPublicFileUrl(fileName: string): string {
  return `/files/${fileName}`;
}

export function fileMetaFromPathname(pathname: string): { hash: string; format: TImageFormat } | null {
  if (!pathname.startsWith("/files/")) return null;
  const fileName = pathname.slice("/files/".length);
  const match = fileName.match(/^([a-f0-9]{64})\.(jpg|jpeg|png|gif|webp)$/i);
  if (!match?.[1] || !match?.[2]) return null;

  const hash = match[1];
  const extension = match[2];
  if (!extension) return null;
  const format = formatFromExtension(extension);
  if (!format) return null;

  return { hash, format };
}
