import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { extensionFromPtyImageFormat } from './core';
import { basePtyOs } from './orpc';

function getBase64Payload(base64OrDataUrl: string): string {
  const match = base64OrDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (match?.[1]) return match[1];
  return base64OrDataUrl;
}

function getRequestTempDirectory(requestId?: string) {
  return join(tmpdir(), 'vibecanvas', 'pty-clipboard', requestId ?? 'anonymous');
}

async function uploadPtyImageToTemp(args: { requestId?: string; base64: string; format: Parameters<typeof extensionFromPtyImageFormat>[0] }) {
  const base64Payload = getBase64Payload(args.base64).trim();
  const bytes = Buffer.from(base64Payload, 'base64');

  if (bytes.length === 0) {
    throw new Error('Invalid or empty image payload');
  }

  const directoryPath = getRequestTempDirectory(args.requestId);
  await mkdir(directoryPath, { recursive: true });

  const fileName = `clipboard-${Date.now()}-${crypto.randomUUID()}.${extensionFromPtyImageFormat(args.format)}`;
  const filePath = join(directoryPath, fileName);
  await writeFile(filePath, bytes);

  return { path: filePath };
}

const apiUploadPtyImage = basePtyOs.uploadImage.handler(async ({ input, context }) => {
  return uploadPtyImageToTemp({
    requestId: context.requestId,
    base64: input.body.base64,
    format: input.body.format,
  });
});

export { apiUploadPtyImage, getBase64Payload, getRequestTempDirectory, uploadPtyImageToTemp };
