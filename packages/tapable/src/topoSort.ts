export type TSortable = { name: string; after?: string[] };

export function topoSort<T extends TSortable>(items: T[]): T[] {
  const byName = new Map<string, T>();
  for (const item of items) {
    if (byName.has(item.name)) throw new Error(`Duplicate name: "${item.name}"`);
    byName.set(item.name, item);
  }

  const sorted: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(item: T) {
    if (visited.has(item.name)) return;
    if (visiting.has(item.name)) throw new Error(`Circular dependency: "${item.name}"`);

    visiting.add(item.name);

    for (const raw of item.after ?? []) {
      const optional = raw.endsWith('?');
      const depName = optional ? raw.slice(0, -1) : raw;
      const dep = byName.get(depName);

      if (!dep && !optional) throw new Error(`"${item.name}" requires "${depName}" but it is not registered`);
      if (dep) visit(dep);
    }

    visiting.delete(item.name);
    visited.add(item.name);
    sorted.push(item);
  }

  for (const item of items) visit(item);
  return sorted;
}
