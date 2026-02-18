import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { setupAutomergeServer } from "@vibecanvas/shell";
import { existsSync, mkdirSync } from 'fs';

// Get database path from config
const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled: true });
if (configError) {
  console.error('[Config Error]', configError);
  process.exit(1);
}

// Initialize Automerge repo with SQLite storage and WebSocket adapter
const { wsAdapter, repo } = setupAutomergeServer(config.databasePath);

export { repo, wsAdapter };
