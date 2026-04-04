export interface ICliConfig {
  cwd: string;
  dev: boolean;
  compiled: boolean;
  version: string;
  command: 'serve' | 'canvas' | 'upgrade' | 'unknown';
  subcommand?: string;
  rawArgv: string[];
  argv: string[];
  port: number;
  dataPath: string;
  dbPath: string;
  configPath: string;
  cachePath: string;
  helpRequested: boolean;
  versionRequested: boolean;
  upgradeTarget?: string;
}
