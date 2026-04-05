import type { IAutomergeService } from "@vibecanvas/automerge-service/IAutomergeService";
import type { ICliConfig } from "@vibecanvas/cli/config";
import type { IDbService } from "@vibecanvas/db/IDbService";

export async function runCanvasQueryCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig & { localServerPort: number }) {
  if (config.localServerPort) {
    // send request
    process.exit(0);
  }
}