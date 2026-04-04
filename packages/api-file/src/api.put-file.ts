import { createHash } from 'crypto';
import { extensionFromFormat, toPublicFileUrl } from '@vibecanvas/core/file/fn.file-storage';
import type { TFileApiContext } from './types';

type TInput = {
  body: {
    base64: string;
    format: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  };
};

function getBase64Payload(base64OrDataUrl: string): string {
  const match = base64OrDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (match?.[1]) return match[1];
  return base64OrDataUrl;
}

async function apiPutFile({ input, context }: { input: TInput; context: TFileApiContext }) {
  const base64Payload = getBase64Payload(input.body.base64).trim();
  const bytes = Buffer.from(base64Payload, 'base64');

  if (bytes.length === 0) {
    throw new Error('Invalid or empty image payload');
  }

  const hash = createHash('sha256').update(bytes).digest('hex');
  const id = crypto.randomUUID();
  const fileName = `${id}.${extensionFromFormat(input.body.format)}`;

  context.db.createFile({
    id,
    hash,
    format: input.body.format,
    base64: base64Payload,
  });

  return {
    url: toPublicFileUrl(fileName),
  };
}

export { apiPutFile };
