import type { Repo } from '@automerge/automerge-repo';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type { BunWSServerAdapter } from './adapters/websocket.adapter';

export interface IAutomergeService extends IService, IStoppableService {
  readonly repo: Repo;
  readonly wsAdapter: BunWSServerAdapter;
}
