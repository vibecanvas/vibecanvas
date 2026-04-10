const ptyImageFormatToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const;

export type TPtyImageFormat = keyof typeof ptyImageFormatToExtension;

export function extensionFromPtyImageFormat(format: TPtyImageFormat): string {
  return ptyImageFormatToExtension[format];
}
