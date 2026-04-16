import type { TImageUploadFormat } from "../types";

export const SUPPORTED_IMAGE_FORMATS = new Set<TImageUploadFormat>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const VC_Z_INDEX_ATTR = "vcZIndex";
