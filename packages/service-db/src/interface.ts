export interface IDbConfig {
  databasePath: string;
  dataDir: string;
  cacheDir: string;
  silentMigrations?: boolean;
}
