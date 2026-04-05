import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fxExecuteCanvasList } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';

export async function runCanvasListCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, _config: ICliConfig) {
  if (services.safeClient) {
    const [error, result] = await services.safeClient.list();
    if (error) {
      console.error(error)
      process.exit(1)
    }
    console.log(result)
    process.exit(0)
  }

  const result = await fxExecuteCanvasList({ dbService: services.db });
  console.log(result)
  process.exit(0)
}
