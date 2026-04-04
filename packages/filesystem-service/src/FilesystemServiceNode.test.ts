import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EventPublisherService } from '@vibecanvas/event-publisher/EventPublisherService';
import { FilesystemServiceNode } from './FilesystemServiceNode';

async function nextEvent<T>(iterator: AsyncIterable<T>, timeoutMs = 3000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const result = await Promise.race([iterator[Symbol.asyncIterator]().next(), timeout]);
  if (result.done || result.value === undefined) throw new Error('Iterator finished unexpectedly');
  return result.value;
}

describe('FilesystemServiceNode', () => {
  let root: string;
  let service: FilesystemServiceNode;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'vibecanvas-filesystem-service-'));
    service = new FilesystemServiceNode(new EventPublisherService());
  });

  afterEach(() => {
    service.stop();
    rmSync(root, { recursive: true, force: true });
  });

  test('home, list, files, inspect, read, write, and move work through the service', () => {
    const sourceDir = join(root, 'source');
    const nestedDir = join(sourceDir, 'nested');
    const destinationDir = join(root, 'destination');
    mkdirSync(sourceDir);
    mkdirSync(nestedDir);
    mkdirSync(destinationDir);

    const filePath = join(sourceDir, 'hello.txt');
    const movedPath = join(destinationDir, 'hello.txt');

    const [writeResult, writeError] = service.write({ path: filePath, content: 'hello world' });
    expect(writeError).toBeNull();
    expect(writeResult).toEqual({ success: true });

    const [homeResult, homeError] = service.home();
    expect(homeError).toBeNull();
    expect(typeof homeResult?.path).toBe('string');

    const [listResult, listError] = service.list({ path: sourceDir, omitFiles: true });
    expect(listError).toBeNull();
    expect(listResult?.children.map((child) => child.name)).toEqual(['nested']);

    const [filesResult, filesError] = service.files({ path: root, glob_pattern: '*.txt', max_depth: 3 });
    expect(filesError).toBeNull();
    expect(filesResult?.children.some((child) => child.name === 'source')).toBe(true);

    const [inspectResult, inspectError] = service.inspect({ path: filePath });
    expect(inspectError).toBeNull();
    expect(inspectResult?.name).toBe('hello.txt');
    expect(inspectResult?.kind).toBe('text');

    const [readResult, readError] = service.read({ path: filePath, content: 'text' });
    expect(readError).toBeNull();
    expect(readResult).toEqual({ kind: 'text', content: 'hello world', truncated: false });

    const [moveResult, moveError] = service.move({
      source_path: filePath,
      destination_dir_path: destinationDir,
    });
    expect(moveError).toBeNull();
    expect(moveResult?.target_path).toBe(movedPath);

    const [movedInspect] = service.inspect({ path: movedPath });
    expect(movedInspect?.path).toBe(movedPath);
  });

  test('watch, keepalive, unwatch, and stop manage watcher lifecycle', async () => {
    const iterator = service.watch(root, 'watch-1');
    expect(iterator).not.toBeNull();
    expect(service.watch(root, 'watch-1')).toBeNull();

    const pendingEvent = nextEvent(iterator!);
    writeFileSync(join(root, 'created.txt'), 'watch me', 'utf8');

    const event = await pendingEvent;
    expect(['rename', 'change']).toContain(event.eventType);
    expect(event.fileName).toBe('created.txt');

    expect(service.keepalive('watch-1')).toBe(true);

    service.unwatch('watch-1');
    expect(service.keepalive('watch-1')).toBe(false);

    const secondIterator = service.watch(root, 'watch-2');
    expect(secondIterator).not.toBeNull();
    service.stop();
    expect(service.keepalive('watch-2')).toBe(false);
  });
});
