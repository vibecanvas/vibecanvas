// Auto-generated file - do not edit
import migration0 from '../../database-migrations/0000_burly_william_stryker.sql' with { type: "file" };
import migration1 from '../../database-migrations/0001_dashing_wraith.sql' with { type: "file" };
import migration2 from '../../database-migrations/meta/0000_snapshot.json' with { type: "file" };
import migration3 from '../../database-migrations/meta/0001_snapshot.json' with { type: "file" };
import migration4 from '../../database-migrations/meta/_journal.json' with { type: "file" };

const embeddedMigrationPaths = new Map<string, string>([
  ["0000_burly_william_stryker.sql", migration0],
  ["0001_dashing_wraith.sql", migration1],
  ["meta/0000_snapshot.json", migration2],
  ["meta/0001_snapshot.json", migration3],
  ["meta/_journal.json", migration4],
]);

export function listEmbeddedMigrationFiles(): string[] {
  return [...embeddedMigrationPaths.keys()];
}

export function getEmbeddedMigrationPath(relativePath: string): string | null {
  return embeddedMigrationPaths.get(relativePath) ?? null;
}
