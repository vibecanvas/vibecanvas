import { resolve } from 'path';
import type { TFilesystemDirNode } from '@vibecanvas/filesystem-service/types';
import { fnCreateFilesystemError } from './core/fn.create-filesystem-error';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiFilesFilesystem = baseFilesystemOs.files.handler(async ({ input, context }) => {
  const root = resolve(input.query.path || context.filesystem.homeDir());
  const maxDepth = input.query.max_depth ?? Number.POSITIVE_INFINITY;

  if (!context.filesystem.exists(root)) {
    return fnToApiFilesystemError(fnCreateFilesystemError('FX.FILESYSTEM.FILES.NOT_FOUND', `Path not found: ${root}`, 404), 'Failed to list files');
  }

  const [rootStats, rootStatsError] = context.filesystem.stat(root);
  if (rootStatsError || !rootStats) return fnToApiFilesystemError(rootStatsError, 'Failed to list files');
  if (!rootStats.isDirectory()) {
    return fnToApiFilesystemError(fnCreateFilesystemError('FX.FILESYSTEM.FILES.NOT_DIRECTORY', `Path is not a directory: ${root}`, 400), 'Failed to list files');
  }

  const [children, walkError] = walkDirectory(context.filesystem, root, maxDepth, input.query.glob_pattern);
  if (walkError || !children) return fnToApiFilesystemError(walkError, 'Failed to list files');

  return { root, children };
});

function walkDirectory(
  filesystem: import('@vibecanvas/filesystem-service/IFilesystemService').IFilesystemService,
  directoryPath: string,
  depthRemaining: number,
  pattern?: string,
): TErrTuple<TFilesystemDirNode[]> {
  const [entries, readError] = filesystem.readdir(directoryPath);
  if (readError || !entries) return [null, readError ?? fnCreateFilesystemError('FX.FILESYSTEM.FILES.FAILED', `Failed to list directory: ${directoryPath}`)];

  const nodes: TFilesystemDirNode[] = [];

  for (const entry of entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
    const entryPath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const [children, childError] = depthRemaining > 0 ? walkDirectory(filesystem, entryPath, depthRemaining - 1, pattern) : [[], null];
      if (childError) return [null, childError];

      const includeDirectory = !pattern || globMatch(entry.name, pattern) || (children?.length ?? 0) > 0;
      if (!includeDirectory) continue;

      nodes.push({ name: entry.name, path: entryPath, is_dir: true, children: children ?? [] });
      continue;
    }

    if (!globMatch(entry.name, pattern)) continue;
    nodes.push({ name: entry.name, path: entryPath, is_dir: false, children: [] });
  }

  return [nodes, null];
}

function globMatch(value: string, pattern?: string): boolean {
  if (!pattern) return true;
  const source = `^${pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*')}$`;
  return new RegExp(source, 'i').test(value);
}

export { apiFilesFilesystem };
