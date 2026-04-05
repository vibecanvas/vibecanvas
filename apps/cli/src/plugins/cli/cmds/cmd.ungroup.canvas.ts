import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { txExecuteCanvasUngroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.ungroup';
import { buildCanvasUngroupInput } from './fn.canvas-subcommand-inputs';

export async function runCanvasUngroupCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasUngroupInput(config.subcommandOptions)

  if (services.safeClient) {
    const [error, result] = await services.safeClient.ungroup(input);
    if (error) {
      console.error(error)
      process.exit(1)
    }
    console.log(result)
    process.exit(0)
  }

  const result = await txExecuteCanvasUngroup({ dbService: services.db, automergeService: services.automerge }, input);
  console.log(result)
  process.exit(0)
}
