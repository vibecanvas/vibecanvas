import type { TImageUploadFormat } from "../services/canvas/interface";

const SUPPORTED_IMAGE_FORMATS = new Set<TImageUploadFormat>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function getSupportedImageFormat(mimeType: string): TImageUploadFormat | null {
  return SUPPORTED_IMAGE_FORMATS.has(mimeType as TImageUploadFormat)
    ? (mimeType as TImageUploadFormat)
    : null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function parseDataUrl(dataUrl: string): { format: TImageUploadFormat; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;

  const format = getSupportedImageFormat(match[1]);
  if (!format) return null;

  return {
    format,
    base64: match[2],
  };
}

export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Failed to load image dimensions"));
    image.src = src;
  });
}

export function getImageSource(args: { url: string | null; base64: string | null }): string | null {
  return args.url ?? args.base64;
}
