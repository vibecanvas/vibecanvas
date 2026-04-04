// Transitional: packages/db still reuses the imperative-shell migration folder
// at runtime, but does not embed those assets yet.

export function listEmbeddedMigrationFiles(): string[] {
  return [];
}

export function getEmbeddedMigrationPath(_relativePath: string): string | null {
  return null;
}
