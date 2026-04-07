import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BunSqliteStorageAdapter } from '../src/adapters/sqlite.adapter';

describe('BunSqliteStorageAdapter', () => {
  const databases: Database[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.close();
    }
  });

  test('loadRange works when adapter uses an existing sqlite connection', async () => {
    const databasePath = join(tmpdir(), `automerge-storage-${crypto.randomUUID()}.sqlite`);
    const sqlite = new Database(databasePath);
    databases.push(sqlite);

    const adapter = new BunSqliteStorageAdapter(sqlite);
    await adapter.save(['doc-1', 'snapshot', 'a'], new Uint8Array([1, 2, 3]));
    await adapter.save(['doc-1', 'incremental', 'b'], new Uint8Array([4, 5, 6]));
    await adapter.save(['doc-2', 'snapshot', 'c'], new Uint8Array([7, 8, 9]));

    const chunks = await adapter.loadRange(['doc-1']);
    const keys = chunks.map((chunk) => chunk.key.join('.')).sort();

    expect(chunks).toHaveLength(2);
    expect(keys).toEqual([
      'doc-1.incremental.b',
      'doc-1.snapshot.a',
    ]);
  });
});
