import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import type { Dirent } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createGlobMatcher, resolveFilesWalkDepth, walkDirectory } from './api.files-filesystem';

function createTestFilesystem() {
  return {
    readdir(path: string): TErrTuple<Dirent[]> {
      try {
        return [readdirSync(path, { withFileTypes: true }), null];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to read directory';
        return [null, { code: 'TEST.READDIR.FAILED', statusCode: 500, externalMessage: { en: message } }];
      }
    },
  } as import('@vibecanvas/filesystem-service/IFilesystemService').IFilesystemService;
}

describe('api.files-filesystem helpers', () => {
  test('resolveFilesWalkDepth caps unfiltered scans to one level but keeps requested depth for glob searches', () => {
    expect(resolveFilesWalkDepth(undefined, undefined)).toBe(1);
    expect(resolveFilesWalkDepth(5, undefined)).toBe(1);
    expect(resolveFilesWalkDepth(5, '')).toBe(1);
    expect(resolveFilesWalkDepth(5, '*.ts')).toBe(5);
    expect(resolveFilesWalkDepth(2, 'package*')).toBe(2);
  });

  test('createGlobMatcher matches case-insensitively and only compiles once per request path', () => {
    const matcher = createGlobMatcher('*.ts');
    expect(matcher).not.toBeNull();
    expect(matcher?.('index.ts')).toBe(true);
    expect(matcher?.('INDEX.TS')).toBe(true);
    expect(matcher?.('index.tsx')).toBe(false);
    expect(createGlobMatcher(undefined)).toBeNull();
  });

  test('walkDirectory respects depth and keeps lazy-load friendly empty children at depth boundary', () => {
    const root = mkdtempSync(join(tmpdir(), 'vibecanvas-api-filesystem-'));
    const service = createTestFilesystem();

    try {
      mkdirSync(join(root, 'alpha'));
      mkdirSync(join(root, 'alpha', 'nested'));
      writeFileSync(join(root, 'alpha', 'nested', 'deep.txt'), 'deep', 'utf8');
      writeFileSync(join(root, 'top.txt'), 'top', 'utf8');

      const [depthZeroNodes, depthZeroError] = walkDirectory(service, root, 0, null);
      expect(depthZeroError).toBeNull();
      expect(depthZeroNodes?.map((node) => ({ name: node.name, is_dir: node.is_dir, childCount: node.children.length }))).toEqual([
        { name: 'alpha', is_dir: true, childCount: 0 },
        { name: 'top.txt', is_dir: false, childCount: 0 },
      ]);

      const [depthOneNodes, depthOneError] = walkDirectory(service, root, 1, null);
      expect(depthOneError).toBeNull();
      expect(depthOneNodes?.[0]?.name).toBe('alpha');
      expect(depthOneNodes?.[0]?.children.map((node) => ({ name: node.name, is_dir: node.is_dir, childCount: node.children.length }))).toEqual([
        { name: 'nested', is_dir: true, childCount: 0 },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('walkDirectory keeps matching descendant path when glob filters out siblings', () => {
    const root = mkdtempSync(join(tmpdir(), 'vibecanvas-api-filesystem-'));
    const service = createTestFilesystem();

    try {
      mkdirSync(join(root, 'src'));
      writeFileSync(join(root, 'src', 'keep.ts'), 'keep', 'utf8');
      writeFileSync(join(root, 'src', 'skip.md'), 'skip', 'utf8');
      writeFileSync(join(root, 'readme.md'), 'root', 'utf8');

      const matcher = createGlobMatcher('*.ts');
      const [nodes, error] = walkDirectory(service, root, 3, matcher);
      expect(error).toBeNull();
      expect(nodes?.map((node) => node.name)).toEqual(['src']);
      expect(nodes?.[0]?.children.map((node) => node.name)).toEqual(['keep.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
