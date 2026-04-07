import type { Database } from 'bun:sqlite';
import { Repo, type PeerId } from '@automerge/automerge-repo';
import { BunSqliteStorageAdapter } from './adapters/sqlite.adapter';
import { BunWSServerAdapter } from './adapters/websocket.adapter';
import type { IAutomergeService } from './IAutomergeService';

export class AutomergeService implements IAutomergeService {
  readonly name = 'automerge' as const;
  readonly repo: Repo;
  readonly wsAdapter: BunWSServerAdapter;

  constructor(database: Database | string) {
    this.wsAdapter = new BunWSServerAdapter();
    const storage = typeof database === 'string'
      ? new BunSqliteStorageAdapter(database)
      : new BunSqliteStorageAdapter(database);

    this.repo = new Repo({
      storage,
      network: [this.wsAdapter],
      peerId: `server-${Date.now()}` as PeerId,
    });

    this.wsAdapter.connect(this.repo.peerId!);
  }

  stop(): void {
    this.wsAdapter.disconnect();
  }
}