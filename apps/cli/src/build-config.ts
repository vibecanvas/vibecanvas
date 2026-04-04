import type { IConfig } from '@vibecanvas/runtime';
import type { TCliParsedArgv } from './parse-argv';

function getDefaultPort(compiled: boolean): number {
  return compiled ? 7496 : 3000;
}

function buildCliConfig(parsed: TCliParsedArgv): IConfig {
  const compiled = process.env.VIBECANVAS_COMPILED === 'true';
  const dev = !compiled;

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
    dbPath: parsed.dbPath,
    helpRequested: parsed.helpRequested,
    versionRequested: parsed.versionRequested,
    upgradeTarget: parsed.upgradeTarget,
  };
}

export { buildCliConfig };
