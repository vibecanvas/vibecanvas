import { Repo, type PeerId } from '@automerge/automerge-repo';
import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import { BunSqliteStorageAdapter } from '@vibecanvas/automerge-service/adapters/sqlite.adapter';
import { setupAutomergeServer } from '@vibecanvas/automerge-service/setupAutomergeServer';
import type { TCanvasCmdContext } from '@vibecanvas/canvas-cmds';
import { createSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite';
import { buildCliConfig } from '../build-config';
import { parseCliArgv } from '../parse-argv';

type TLocalCanvasState = {
  dbPath: string;
  context: TCanvasCmdContext;
  dispose(): void;
};

async function loadPersistedCanvasDoc(databasePath: string, automergeUrl: string): Promise<TCanvasDoc> {
  const repo = new Repo({ storage: new BunSqliteStorageAdapter(databasePath), peerId: `canvas-cli-${crypto.randomUUID()}` as PeerId });
  const handle = await repo.find<TCanvasDoc>(automergeUrl as never);
  await handle.whenReady();
  const doc = handle.doc();
  if (!doc) throw new Error(`Canvas doc '${automergeUrl}' is unavailable.`);
  return structuredClone(doc);
}

async function waitForPersistedCanvasDoc(args: {
  databasePath: string;
  automergeUrl: string;
  predicate: (doc: TCanvasDoc) => boolean;
  timeoutMs?: number;
}): Promise<TCanvasDoc> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < (args.timeoutMs ?? 5000)) {
    try {
      const doc = await loadPersistedCanvasDoc(args.databasePath, args.automergeUrl);
      if (args.predicate(doc)) {
        await Bun.sleep(100);
        const confirmedDoc = await loadPersistedCanvasDoc(args.databasePath, args.automergeUrl);
        if (args.predicate(confirmedDoc)) return confirmedDoc;
      }
    } catch (error) {
      lastError = error;
    }

    await Bun.sleep(25);
  }

  throw new Error(`Timed out waiting for persisted canvas doc '${args.automergeUrl}': ${String(lastError)}`);
}

function createLocalCanvasState(argv: readonly string[]): TLocalCanvasState {
  process.env.VIBECANVAS_SILENT_DB_MIGRATIONS = '1';
  process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = '1';

  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const dbPath = process.env.VIBECANVAS_DB ?? config.dbPath;
  const db = createSqliteDb({
    databasePath: dbPath,
    dataDir: config.dataPath,
    cacheDir: config.cachePath,
    silentMigrations: true,
  });
  const automerge = setupAutomergeServer(dbPath);

  return {
    dbPath,
    context: {
      async listCanvasRows() {
        return db.listCanvas();
      },
      async loadCanvasHandle(row) {
        const handle = await automerge.repo.find<TCanvasDoc>(row.automerge_url as never);
        await handle.whenReady();
        return {
          handle,
          source: 'offline',
        };
      },
      async waitForMutation(args) {
        return waitForPersistedCanvasDoc({
          databasePath: dbPath,
          automergeUrl: args.automergeUrl,
          predicate: args.predicate,
          timeoutMs: 5000,
        });
      },
    },
    dispose() {
      automerge.stop();
      db.stop();
    },
  };
}

export { createLocalCanvasState };
export type { TLocalCanvasState };
