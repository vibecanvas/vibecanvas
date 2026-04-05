import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { txExecuteCanvasGroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.group';
import { buildCanvasGroupInput } from './fn.canvas-subcommand-inputs';

export async function runCanvasGroupCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasGroupInput(config.subcommandOptions)

  if (services.safeClient) {
    const [error, result] = await services.safeClient.group(input);
    if (error) {
      console.error(error)
      process.exit(1)
    }
    console.log(result)
    process.exit(0)
  }

  const result = await txExecuteCanvasGroup({ dbService: services.db, automergeService: services.automerge }, input);
  console.log(result)
  process.exit(0)
}
