import { describe, expect, mock, test } from 'bun:test';
import { createFileResponse, createPublicAssetLookup } from '../src/plugins/server/http';
import type { IDbService } from '@vibecanvas/db/IDbService';

type TMockDb = Pick<IDbService, 'getFile'>;

function createDb(getFile: TMockDb['getFile']): IDbService {
  return {
    name: 'db',
    stop() {},
    listCanvas() { return []; },
    getFullCanvas() { return null; },
    updateCanvas() { return null; },
    getFileTree() { return null; },
    createFileTree() { throw new Error('not implemented'); },
    updateFileTree() { return null; },
    deleteFileTree() { return false; },
    createFile() { throw new Error('not implemented'); },
    getFile,
    deleteFile() {},
  } as IDbService;
}

describe('server http helpers', () => {
  test('serves persisted file blobs with cache headers and etag', async () => {
    const db = createDb(mock(() => ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      hash: 'abc123',
      format: 'image/png',
      base64: Buffer.from('hello').toString('base64'),
    } as any)));

    const response = createFileResponse(
      new Request('http://localhost/files/123e4567-e89b-12d3-a456-426614174000.png'),
      db,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('etag')).toBe('"123e4567-e89b-12d3-a456-426614174000:abc123"');
    expect(await response.text()).toBe('hello');
  });

  test('returns 304 when file etag matches', () => {
    const db = createDb(mock(() => ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      hash: 'abc123',
      format: 'image/png',
      base64: Buffer.from('hello').toString('base64'),
    } as any)));

    const response = createFileResponse(
      new Request('http://localhost/files/123e4567-e89b-12d3-a456-426614174000.png', {
        headers: { 'if-none-match': '"123e4567-e89b-12d3-a456-426614174000:abc123"' },
      }),
      db,
    );

    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe('"123e4567-e89b-12d3-a456-426614174000:abc123"');
  });

  test('returns 404 for invalid or missing file records', () => {
    const missingDb = createDb(mock(() => null));

    expect(createFileResponse(new Request('http://localhost/files/not-a-file'), missingDb).status).toBe(404);
    expect(
      createFileResponse(
        new Request('http://localhost/files/123e4567-e89b-12d3-a456-426614174000.png'),
        missingDb,
      ).status,
    ).toBe(404);
  });

  test('resolves public assets and blocks path traversal', () => {
    const existing = new Set(['/repo/apps/cli/public/index.html', '/repo/apps/cli/public/assets/app.js']);

    const { getPublicAssetPath } = createPublicAssetLookup('/repo/apps/cli/src/plugins/server', {
      existsSync(path: string) {
        return existing.has(path);
      },
      normalize(path: string) {
        const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
        const parts = normalized.split('/');
        const resolved: string[] = [];
        for (const part of parts) {
          if (!part || part === '.') continue;
          if (part === '..') {
            resolved.pop();
            continue;
          }
          resolved.push(part);
        }
        return `/${resolved.join('/')}`;
      },
      join(...parts: string[]) {
        return parts.join('/');
      },
    });

    expect(getPublicAssetPath('/')).toBe('/repo/apps/cli/public/index.html');
    expect(getPublicAssetPath('/assets/app.js')).toBe('/repo/apps/cli/public/assets/app.js');
    expect(getPublicAssetPath('/../../etc/passwd')).toBeNull();
    expect(getPublicAssetPath('/missing.js')).toBeNull();
  });
});
