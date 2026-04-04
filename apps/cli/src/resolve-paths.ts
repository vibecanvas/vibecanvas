import { existsSync, mkdirSync } from 'fs';
import type { IConfig } from '@vibecanvas/runtime';
import { txConfigPath } from '../../../packages/shared-functions/src/vibecanvas-config/tx.config-path';

type TCliResolvedPaths = {
  databasePath: string;
  dataDir: string;
  configDir: string;
  cacheDir: string;
};

function resolveCliPaths(config: IConfig): TCliResolvedPaths {
  const env = { ...process.env };

  if (config.dbPath) {
    env.VIBECANVAS_DB = config.dbPath;
  }

  const [resolved, resolvedError] = txConfigPath(
    { fs: { existsSync, mkdirSync } },
    { env, isCompiled: config.compiled },
  );

  if (resolvedError || !resolved) {
    console.error(resolvedError);
    process.exit(1);
  }

  return {
    databasePath: resolved.databasePath,
    dataDir: resolved.paths.dataDir,
    configDir: resolved.paths.configDir,
    cacheDir: resolved.paths.cacheDir,
  };
}

export { resolveCliPaths };
export type { TCliResolvedPaths };
