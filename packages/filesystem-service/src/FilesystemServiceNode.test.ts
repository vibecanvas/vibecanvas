import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EventPublisherService } from '@vibecanvas/event-publisher-service/EventPublisherService';
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

  test('raw filesystem primitives work through the service', () => {
    const sourceDir = join(root, 'source');
    const destinationDir = join(root, 'destination');
    mkdirSync(sourceDir);
    mkdirSync(destinationDir);

    const filePath = join(sourceDir, 'hello.txt');
    const movedPath = join(destinationDir, 'hello.txt');

    const [writeResult, writeError] = service.writeFile(filePath, 'hello world');
    expect(writeError).toBeNull();
    expect(writeResult).toBeUndefined();

    expect(typeof service.homeDir()).toBe('string');
    expect(service.exists(filePath)).toBe(true);

    const [entries, entriesError] = service.readdir(sourceDir);
    expect(entriesError).toBeNull();
    expect(entries?.map((entry) => entry.name)).toEqual(['hello.txt']);

    const [stats, statsError] = service.stat(filePath);
    expect(statsError).toBeNull();
    expect(stats?.isFile()).toBe(true);

    const [contents, contentsError] = service.readFile(filePath);
    expect(contentsError).toBeNull();
    expect(contents?.toString('utf8')).toBe('hello world');

    const [renameResult, renameError] = service.rename(filePath, movedPath);
    expect(renameError).toBeNull();
    expect(renameResult).toBeUndefined();
    expect(service.exists(movedPath)).toBe(true);
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
