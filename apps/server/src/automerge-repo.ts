import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { setupAutomergeServer } from "@vibecanvas/shell";
import { existsSync, mkdirSync } from 'fs';

let repo: ReturnType<typeof setupAutomergeServer>["repo"] | null = null;
let wsAdapter: ReturnType<typeof setupAutomergeServer>["wsAdapter"] | null = null;

export function initAutomergeRepo() {
  if (repo && wsAdapter) {
    return { repo, wsAdapter };
  }

  const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled: true });
  if (configError || !config) {
    console.error('[Config Error]', configError);
    process.exit(1);
  }

  const instance = setupAutomergeServer(config.paths.databasePath);
  repo = instance.repo;
  wsAdapter = instance.wsAdapter;
  return instance;
}

export function getRepo() {
  return initAutomergeRepo().repo;
}

export function getWsAdapter() {
  return initAutomergeRepo().wsAdapter;
}
