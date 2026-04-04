import type { Database } from 'bun:sqlite';
import { Repo, type PeerId } from '@automerge/automerge-repo';
import { BunSqliteStorageAdapter } from './adapters/sqlite.adapter';
import { BunWSServerAdapter } from './adapters/websocket.adapter';

function shouldLogAutomergeMessages(): boolean {
  return process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS !== '1';
}

export interface AutomergeServerInstance {
  repo: Repo;
  wsAdapter: BunWSServerAdapter;
}

export function setupAutomergeServer(database: Database | string): AutomergeServerInstance {
  const wsAdapter = new BunWSServerAdapter();
  const storage = typeof database === 'string'
    ? new BunSqliteStorageAdapter(database)
    : new BunSqliteStorageAdapter(database);

  const repo = new Repo({
    storage,
    network: [wsAdapter],
    peerId: `server-${Date.now()}` as PeerId,
  });

  if (shouldLogAutomergeMessages()) {
    console.log('[Automerge] Repo initialized with shared SQLite storage');
  }

  return { repo, wsAdapter };
}
