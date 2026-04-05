import { expect, test, beforeEach, describe } from "bun:test";
import { DbServiceBunSqlite } from "@vibecanvas/db/DbServiceBunSqlite"
import * as schema from "@vibecanvas/db/schema"
import { tmpdir } from "node:os"

describe('list canvas command', () => {
  let dbService!: DbServiceBunSqlite

  beforeEach(() => {
    dbService = new DbServiceBunSqlite({
      cacheDir: tmpdir(),
      databasePath: ":memory:",
      dataDir: tmpdir(),
      silentMigrations: true
    })
  })
  test("2 + 2", () => {
    expect(2 + 2).toBe(4);
    console.log(dbService.listCanvas())
  });
})