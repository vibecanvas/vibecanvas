// Auto-generated file - do not edit
import migration0 from '../../database-migrations/0000_burly_william_stryker.sql' with { type: "file" };
import migration1 from '../../database-migrations/0001_dashing_wraith.sql' with { type: "file" };
import migration2 from '../../database-migrations/0002_tiresome_silhouette.sql' with { type: "file" };
import migration3 from '../../database-migrations/0003_lovely_moon_knight.sql' with { type: "file" };
import migration4 from '../../database-migrations/0004_watery_komodo.sql' with { type: "file" };
import migration5 from '../../database-migrations/0005_puzzling_jubilee.sql' with { type: "file" };
import migration6 from '../../database-migrations/0006_opposite_puck.sql' with { type: "file" };
import migration7 from '../../database-migrations/0007_certain_talos.sql' with { type: "file" };
import migration8 from '../../database-migrations/0008_rainy_puppet_master.sql' with { type: "file" };
import migration9 from '../../database-migrations/0009_remove_chats.sql' with { type: "file" };
import migration10 from '../../database-migrations/meta/0000_snapshot.json' with { type: "file" };
import migration11 from '../../database-migrations/meta/0001_snapshot.json' with { type: "file" };
import migration12 from '../../database-migrations/meta/0002_snapshot.json' with { type: "file" };
import migration13 from '../../database-migrations/meta/0003_snapshot.json' with { type: "file" };
import migration14 from '../../database-migrations/meta/0004_snapshot.json' with { type: "file" };
import migration15 from '../../database-migrations/meta/0005_snapshot.json' with { type: "file" };
import migration16 from '../../database-migrations/meta/0006_snapshot.json' with { type: "file" };
import migration17 from '../../database-migrations/meta/0007_snapshot.json' with { type: "file" };
import migration18 from '../../database-migrations/meta/0008_snapshot.json' with { type: "file" };
import migration19 from '../../database-migrations/meta/_journal.json' with { type: "file" };

const embeddedMigrationPaths = new Map<string, string>([
  ["0000_burly_william_stryker.sql", migration0],
  ["0001_dashing_wraith.sql", migration1],
  ["0002_tiresome_silhouette.sql", migration2],
  ["0003_lovely_moon_knight.sql", migration3],
  ["0004_watery_komodo.sql", migration4],
  ["0005_puzzling_jubilee.sql", migration5],
  ["0006_opposite_puck.sql", migration6],
  ["0007_certain_talos.sql", migration7],
  ["0008_rainy_puppet_master.sql", migration8],
  ["0009_remove_chats.sql", migration9],
  ["meta/0000_snapshot.json", migration10],
  ["meta/0001_snapshot.json", migration11],
  ["meta/0002_snapshot.json", migration12],
  ["meta/0003_snapshot.json", migration13],
  ["meta/0004_snapshot.json", migration14],
  ["meta/0005_snapshot.json", migration15],
  ["meta/0006_snapshot.json", migration16],
  ["meta/0007_snapshot.json", migration17],
  ["meta/0008_snapshot.json", migration18],
  ["meta/_journal.json", migration19],
]);

export function listEmbeddedMigrationFiles(): string[] {
  return [...embeddedMigrationPaths.keys()];
}

export function getEmbeddedMigrationPath(relativePath: string): string | null {
  return embeddedMigrationPaths.get(relativePath) ?? null;
}
