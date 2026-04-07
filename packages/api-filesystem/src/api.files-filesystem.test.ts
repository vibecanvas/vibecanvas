import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import type { Dirent } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { walkDirectory } from './api.files-filesystem';

function createTestFilesystem() {
  return {
    readdir(path: string): TErrTuple<Dirent[]> {
      try {
        return [readdirSync(path, { withFileTypes: true }), null];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to read directory';
        return [null, { code: 'SRV.TEST.READDIR.FAILED', statusCode: 500, externalMessage: { en: message } }];
      }
    },
  } as import('@vibecanvas/service-filesystem/IFilesystemService').IFilesystemService;
}

describe('api.files-filesystem helpers', () => {
  test('walkDirectory respects depth and keeps lazy-load friendly empty children at depth boundary', () => {
    const root = mkdtempSync(join(tmpdir(), 'vibecanvas-api-filesystem-'));
    const service = createTestFilesystem();

    try {
      mkdirSync(join(root, 'alpha'));
      mkdirSync(join(root, 'alpha', 'nested'));
      writeFileSync(join(root, 'alpha', 'nested', 'deep.txt'), 'deep', 'utf8');
      writeFileSync(join(root, 'top.txt'), 'top', 'utf8');

      const [depthZeroNodes, depthZeroError] = walkDirectory(service, root, 0);
      expect(depthZeroError).toBeNull();
      expect(depthZeroNodes?.map((node) => ({ name: node.name, is_dir: node.is_dir, childCount: node.children.length }))).toEqual([
        { name: 'alpha', is_dir: true, childCount: 0 },
        { name: 'top.txt', is_dir: false, childCount: 0 },
      ]);

      const [depthOneNodes, depthOneError] = walkDirectory(service, root, 1);
      expect(depthOneError).toBeNull();
      expect(depthOneNodes?.[0]?.name).toBe('alpha');
      expect(depthOneNodes?.[0]?.children.map((node) => ({ name: node.name, is_dir: node.is_dir, childCount: node.children.length }))).toEqual([
        { name: 'nested', is_dir: true, childCount: 0 },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('walkDirectory returns all children without filtering', () => {
    const root = mkdtempSync(join(tmpdir(), 'vibecanvas-api-filesystem-'));
    const service = createTestFilesystem();

    try {
      mkdirSync(join(root, 'src'));
      writeFileSync(join(root, 'src', 'keep.ts'), 'keep', 'utf8');
      writeFileSync(join(root, 'src', 'skip.md'), 'skip', 'utf8');
      writeFileSync(join(root, 'readme.md'), 'root', 'utf8');

      const [nodes, error] = walkDirectory(service, root, 3);
      expect(error).toBeNull();
      expect(nodes?.map((node) => node.name)).toEqual(['src', 'readme.md']);
      expect(nodes?.[0]?.children.map((node) => node.name)).toEqual(['keep.ts', 'skip.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
