// Auto-generated file - do not edit
import migration0 from '../../database-migrations/0000_burly_william_stryker.sql' with { type: "file" };
import migration1 from '../../database-migrations/0001_dashing_wraith.sql' with { type: "file" };
import migration2 from '../../database-migrations/0002_tiresome_silhouette.sql' with { type: "file" };
import migration3 from '../../database-migrations/0003_lovely_moon_knight.sql' with { type: "file" };
import migration4 from '../../database-migrations/0004_watery_komodo.sql' with { type: "file" };
import migration5 from '../../database-migrations/0005_puzzling_jubilee.sql' with { type: "file" };
import migration6 from '../../database-migrations/meta/0000_snapshot.json' with { type: "file" };
import migration7 from '../../database-migrations/meta/0001_snapshot.json' with { type: "file" };
import migration8 from '../../database-migrations/meta/0002_snapshot.json' with { type: "file" };
import migration9 from '../../database-migrations/meta/0003_snapshot.json' with { type: "file" };
import migration10 from '../../database-migrations/meta/0004_snapshot.json' with { type: "file" };
import migration11 from '../../database-migrations/meta/0005_snapshot.json' with { type: "file" };
import migration12 from '../../database-migrations/meta/_journal.json' with { type: "file" };

const embeddedMigrationPaths = new Map<string, string>([
  ["0000_burly_william_stryker.sql", migration0],
  ["0001_dashing_wraith.sql", migration1],
  ["0002_tiresome_silhouette.sql", migration2],
  ["0003_lovely_moon_knight.sql", migration3],
  ["0004_watery_komodo.sql", migration4],
  ["0005_puzzling_jubilee.sql", migration5],
  ["meta/0000_snapshot.json", migration6],
  ["meta/0001_snapshot.json", migration7],
  ["meta/0002_snapshot.json", migration8],
  ["meta/0003_snapshot.json", migration9],
  ["meta/0004_snapshot.json", migration10],
  ["meta/0005_snapshot.json", migration11],
  ["meta/_journal.json", migration12],
]);

export function listEmbeddedMigrationFiles(): string[] {
  return [...embeddedMigrationPaths.keys()];
}

export function getEmbeddedMigrationPath(relativePath: string): string | null {
  return embeddedMigrationPaths.get(relativePath) ?? null;
}
