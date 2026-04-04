import type { ICliConfig } from './config';

type TCliResolvedPaths = {
  databasePath: string;
  dataDir: string;
  configDir: string;
  cacheDir: string;
};

function resolveCliPaths(config: ICliConfig): TCliResolvedPaths {
  return {
    databasePath: config.dbPath,
    dataDir: config.dataPath,
    configDir: config.configPath,
    cacheDir: config.cachePath,
  };
}

export { resolveCliPaths };
export type { TCliResolvedPaths };
