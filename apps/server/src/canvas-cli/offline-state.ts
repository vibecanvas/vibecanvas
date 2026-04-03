import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { existsSync, mkdirSync } from "node:fs";

async function openOfflineCanvasState() {
  const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } }, {
    isCompiled: typeof VIBECANVAS_COMPILED !== "undefined" ? VIBECANVAS_COMPILED : false,
  });

  if (configError || !config) {
    throw new Error(configError?.internalMessage ?? "Failed to resolve canvas database path.");
  }

  const [{ default: db }, { getRepo }] = await Promise.all([
    import("@vibecanvas/shell/database/db"),
    import("../automerge-repo"),
  ]);

  return {
    db,
    repo: getRepo(),
    dbPath: config.databasePath,
  };
}

export { openOfflineCanvasState };
