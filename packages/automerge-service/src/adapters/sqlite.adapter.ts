import type {
  Chunk,
  StorageAdapterInterface,
  StorageKey,
} from '@automerge/automerge-repo';
import { Database, type Statement } from 'bun:sqlite';

interface Options {
  separator?: string;
}

type Data = { data: Uint8Array };

export class BunSqliteStorageAdapter implements StorageAdapterInterface {
  private db: Database;
  private separator: string;

  private load_stmt: Statement<Data, [string]>;
  private save_stmt: Statement<void, [string, Uint8Array]>;
  private remove_stmt: Statement<void, [string]>;
  private load_range_stmt: Statement<{ key: string; data: Uint8Array }, [string]>;
  private remove_range_stmt: Statement<void, [string]>;

  constructor(database: string, options?: Options);
  constructor(database: Database, options?: Options);
  constructor(database: Database | string, options?: Options) {
    if (typeof database === 'string') {
      this.db = new Database(database, { strict: true });
      this.db.run('PRAGMA journal_mode=WAL;');
    } else {
      this.db = database;
    }
    const tableName = 'automerge_repo_data';
    this.separator = options?.separator ?? '.';

    this.db.run(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        updated_at TEXT,
        data BLOB
      );
    `);

    this.load_stmt = this.db.prepare(`SELECT data FROM ${tableName} WHERE key = ?;`);
    this.save_stmt = this.db.prepare(`
      INSERT INTO ${tableName} (key, updated_at, data)
        VALUES (?, datetime(), ?)
        ON CONFLICT DO UPDATE SET data = excluded.data, updated_at = datetime();
    `);
    this.remove_stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE key = ?;`);
    this.load_range_stmt = this.db.prepare(`SELECT key, data FROM ${tableName} WHERE key GLOB ?;`);
    this.remove_range_stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE key GLOB ?;`);
  }

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    const key = this.keyToString(keyArray);
    const result = this.load_stmt.get(key);
    return result?.data;
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    const key = this.keyToString(keyArray);
    this.save_stmt.run(key, binary);
  }

  async remove(keyArray: string[]): Promise<void> {
    const key = this.keyToString(keyArray);
    this.remove_stmt.run(key);
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const prefix = this.keyToString(keyPrefix);
    const result = this.load_range_stmt.all(`${prefix}*`);
    return result.map(({ key, data }) => ({
      key: this.stringToKey(key),
      data,
    }));
  }

  async removeRange(keyPrefix: string[]): Promise<void> {
    const prefix = this.keyToString(keyPrefix);
    this.remove_range_stmt.run(`${prefix}*`);
  }

  private keyToString(key: StorageKey): string {
    return key.join(this.separator);
  }

  private stringToKey(key: string): StorageKey {
    return key.split(this.separator);
  }
}
