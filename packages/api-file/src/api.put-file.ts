import { createHash } from 'crypto';
import { extensionFromFormat, toPublicFileUrl } from './core/fn.file-storage';
import { baseFileOs } from './orpc';

function getBase64Payload(base64OrDataUrl: string): string {
  const match = base64OrDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (match?.[1]) return match[1];
  return base64OrDataUrl;
}

const apiPutFile = baseFileOs.put.handler(async ({ input, context }) => {
  const base64Payload = getBase64Payload(input.body.base64).trim();
  const bytes = Buffer.from(base64Payload, 'base64');

  if (bytes.length === 0) {
    throw new Error('Invalid or empty image payload');
  }

  const hash = createHash('sha256').update(bytes).digest('hex');
  const id = crypto.randomUUID();
  const fileName = `${id}.${extensionFromFormat(input.body.format)}`;

  context.db.file.create({
    id,
    hash,
    format: input.body.format,
    base64: base64Payload,
  });

  return {
    url: toPublicFileUrl(fileName),
  };
});

export { apiPutFile };
