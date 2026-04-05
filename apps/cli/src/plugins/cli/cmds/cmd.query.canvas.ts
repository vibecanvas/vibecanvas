import type { IAutomergeService } from "@vibecanvas/automerge-service/IAutomergeService";
import type { ICliConfig } from "@vibecanvas/cli/config";
import type { IDbService } from "@vibecanvas/db/IDbService";
import type { TSafeCanvasCmdClient } from "../core/fn.build-rpc-link";
import { fxExecuteCanvasQuery } from "@vibecanvas/canvas-cmds/cmds/fx.cmd.query";

export async function runCanvasQueryCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const result = await fxExecuteCanvasQuery({ dbService: services.db, automergeService: services.automerge }, {
    selector: {
      canvasId: config.subcommandOptions?.canvasId,
      canvasNameQuery: config.subcommandOptions?.canvasNameQuery,
    },
  });

  console.log(result);
}
