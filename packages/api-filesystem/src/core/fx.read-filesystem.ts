import { resolve } from 'path';
import type { TFilesystemReadArgs, TFilesystemReadResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { fnCreateFilesystemError } from './fn.create-filesystem-error';
import { fnDetectFileKind } from './fn.detect-file-kind';
import { fnDetectMime } from './fn.detect-mime';

function fxReadFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemReadArgs): TErrTuple<TFilesystemReadResult> {
  const path = resolve(args.path);
  const [buffer, error] = portal.filesystem.readFile(path);
  if (error || !buffer) {
    return [null, error ?? fnCreateFilesystemError('FX.FILESYSTEM.READ.NOT_FOUND', `Path not found: ${path}`, 404)];
  }

  const maxBytes = args.maxBytes ?? buffer.length;
  const truncatedBuffer = buffer.subarray(0, maxBytes);
  const truncated = truncatedBuffer.length < buffer.length;
  const kind = fnDetectFileKind(path);
  const mime = fnDetectMime(path) ?? undefined;

  if (args.content === 'none') {
    return [{ kind: 'none', size: buffer.length }, null];
  }

  if (kind === 'text' && args.content !== 'base64' && args.content !== 'binary') {
    return [{
      kind: 'text',
      content: truncatedBuffer.toString('utf8'),
      truncated,
    }, null];
  }

  if (args.content === 'binary') {
    return [{
      kind: 'binary',
      content: truncatedBuffer.toString('hex'),
      size: buffer.length,
      mime,
      encoding: 'hex',
    }, null];
  }

  if (args.content === 'base64') {
    return [{
      kind: 'binary',
      content: truncatedBuffer.toString('base64'),
      size: buffer.length,
      mime,
      encoding: 'base64',
    }, null];
  }

  return [{
    kind: 'binary',
    content: null,
    size: buffer.length,
    mime,
  }, null];
}

export { fxReadFilesystem };
