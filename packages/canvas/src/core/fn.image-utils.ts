import type { TImageUploadFormat } from "../types";
import { SUPPORTED_IMAGE_FORMATS } from "./CONSTANTS";

export type TArgsFileToDataUrl = {
  file: File;
};

export type TPortalFileToDataUrl = {
  createFileReader: () => FileReader;
};

export type TArgsGetImageDimensions = {
  src: string;
};

export type TPortalGetImageDimensions = {
  createImage: () => HTMLImageElement;
};

export function fxGetSupportedImageFormat(mimeType: string): TImageUploadFormat | null {
  return SUPPORTED_IMAGE_FORMATS.has(mimeType as TImageUploadFormat)
    ? (mimeType as TImageUploadFormat)
    : null;
}

export function fxFileToDataUrl(
  portal: TPortalFileToDataUrl,
  args: TArgsFileToDataUrl,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = portal.createFileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file"));
    reader.readAsDataURL(args.file);
  });
}

export function fxParseDataUrl(dataUrl: string): { format: TImageUploadFormat; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;

  const format = fxGetSupportedImageFormat(match[1]);
  if (!format) return null;

  return {
    format,
    base64: match[2],
  };
}

export function fxGetImageDimensions(
  portal: TPortalGetImageDimensions,
  args: TArgsGetImageDimensions,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = portal.createImage();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Failed to load image dimensions"));
    image.src = args.src;
  });
}

export function fxGetImageSource(args: { url: string | null; base64: string | null }): string | null {
  return args.url ?? args.base64;
}
