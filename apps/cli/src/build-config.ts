import { txConfigPath } from '@vibecanvas/shared-functions/vibecanvas-config/tx.config-path';
import { existsSync, mkdirSync } from 'fs';
import type { ICliConfig } from './config';
import type { TCliParsedArgv } from './parse-argv';

function getDefaultPort(compiled: boolean): number {
  return compiled ? 7496 : 3000;
}

function buildCliConfig(parsed: TCliParsedArgv): ICliConfig {
  const compiled = process.env.VIBECANVAS_COMPILED === 'true';
  const dev = !compiled;
  const [resolved, error] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled: compiled });

  if (error || !resolved) {
    console.error(error);
    process.exit(1);
  }

  return {
    cwd: process.cwd(),
    dev,
    compiled,
    version: process.env.VIBECANVAS_VERSION ?? '0.0.0',
    command: parsed.command,
    subcommand: parsed.subcommand,
    rawArgv: parsed.rawArgv,
    argv: parsed.argv,
    port: parsed.port ?? getDefaultPort(compiled),
    dataPath: resolved.paths.dataDir,
    dbPath: parsed.dbPath ?? resolved.databasePath,
    configPath: resolved.configDir,
    cachePath: resolved.paths.cacheDir,
    helpRequested: parsed.helpRequested,
    versionRequested: parsed.versionRequested,
    upgradeTarget: parsed.upgradeTarget,
    subcommandOptions: parsed.subcommandOptions,
  };
}

export { buildCliConfig };
