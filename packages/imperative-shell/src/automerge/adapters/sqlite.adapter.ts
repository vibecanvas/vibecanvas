import type {
  Chunk,
  StorageAdapterInterface,
  StorageKey,
} from "@automerge/automerge-repo"
import { Database, type Statement } from "bun:sqlite"

interface Options {
  separator?: string
}

type Key = { key: string }
type Data = { data: Uint8Array }
type Prefix = { prefix: string }
type KeyData = Key & Data

export class BunSqliteStorageAdapter implements StorageAdapterInterface {
  private db: Database
  private separator: string

  private load_stmt: Statement<Data, [Key]>
  private save_stmt: Statement<void, [KeyData]>
  private remove_stmt: Statement<void, [Key]>
  private load_range_stmt: Statement<KeyData, [Prefix]>
  private remove_range_stmt: Statement<void, [Prefix]>

  constructor(database: string, options?: Options)
  constructor(database: Database, options?: Options)
  constructor(database: Database | string, options?: Options) {
    if (typeof database === "string") {
      this.db = new Database(database, { strict: true })
      this.db.run("PRAGMA journal_mode=WAL;")
    } else {
      this.db = database
    }
    const tableName = "automerge_repo_data"
    this.separator = options?.separator ?? "."

    this.load_stmt = this.db.prepare(
      `SELECT data FROM ${tableName} WHERE key = :key;`
    )
    this.save_stmt = this.db.prepare(`
      INSERT INTO ${tableName} (key, updated_at, data)
        VALUES (:key, datetime(), :data)
        ON CONFLICT DO UPDATE SET data = excluded.data, updated_at = datetime();
    `)
    this.remove_stmt = this.db.prepare(
      `DELETE FROM ${tableName} WHERE key = :key;`
    )
    this.load_range_stmt = this.db.prepare(
      `SELECT key, data FROM ${tableName} WHERE key GLOB :prefix;`
    )
    this.remove_range_stmt = this.db.prepare(
      `DELETE FROM ${tableName} WHERE key GLOB :prefix;`
    )
  }

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    const key = this.keyToString(keyArray)
    const result = this.load_stmt.get({ key })
    return result?.data
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    const key = this.keyToString(keyArray)
    this.save_stmt.run({ key, data: binary })
  }

  async remove(keyArray: string[]): Promise<void> {
    const key = this.keyToString(keyArray)
    this.remove_stmt.run({ key })
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const prefix = this.keyToString(keyPrefix)
    const result = this.load_range_stmt.all({ prefix: `${prefix}*` })
    return result.map(({ key, data }) => ({
      key: this.stringToKey(key),
      data,
    }))
  }

  async removeRange(keyPrefix: string[]): Promise<void> {
    const prefix = this.keyToString(keyPrefix)
    this.remove_range_stmt.run({ prefix: `${prefix}*` })
  }

  private keyToString(key: StorageKey): string {
    return key.join(this.separator)
  }

  private stringToKey(key: string): StorageKey {
    return key.split(this.separator)
  }
}
