import { resolve } from 'path';
import type { TFilesystemDirNode, TFilesystemFilesArgs, TFilesystemFilesResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { fnCreateFilesystemError } from './fn.create-filesystem-error';
import { fnGlobMatch } from './fn.glob-match';

function fxFilesFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemFilesArgs): TErrTuple<TFilesystemFilesResult> {
  const root = resolve(args.path || portal.filesystem.homeDir());
  const maxDepth = args.max_depth ?? Number.POSITIVE_INFINITY;

  if (!portal.filesystem.exists(root)) {
    return [null, fnCreateFilesystemError('FX.FILESYSTEM.FILES.NOT_FOUND', `Path not found: ${root}`, 404)];
  }

  const [rootStats, rootStatsError] = portal.filesystem.stat(root);
  if (rootStatsError || !rootStats) {
    return [null, rootStatsError ?? fnCreateFilesystemError('FX.FILESYSTEM.FILES.FAILED', `Failed to inspect path: ${root}`)];
  }

  if (!rootStats.isDirectory()) {
    return [null, fnCreateFilesystemError('FX.FILESYSTEM.FILES.NOT_DIRECTORY', `Path is not a directory: ${root}`, 400)];
  }

  const [children, walkError] = walkDirectory(portal.filesystem, root, maxDepth, args.glob_pattern);
  if (walkError) return [null, walkError];

  return [{ root, children }, null];
}

function walkDirectory(
  filesystem: IFilesystemService,
  directoryPath: string,
  depthRemaining: number,
  pattern?: string,
): TErrTuple<TFilesystemDirNode[]> {
  const [entries, readError] = filesystem.readdir(directoryPath);
  if (readError || !entries) {
    return [null, readError ?? fnCreateFilesystemError('FX.FILESYSTEM.FILES.FAILED', `Failed to list directory: ${directoryPath}`)];
  }

  const nodes: TFilesystemDirNode[] = [];

  for (const entry of entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
    const entryPath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const [children, childError] = depthRemaining > 0
        ? walkDirectory(filesystem, entryPath, depthRemaining - 1, pattern)
        : [[], null];
      if (childError) return [null, childError];

      const includeDirectory = !pattern || fnGlobMatch(entry.name, pattern) || (children?.length ?? 0) > 0;
      if (!includeDirectory) continue;

      nodes.push({
        name: entry.name,
        path: entryPath,
        is_dir: true,
        children: children ?? [],
      });
      continue;
    }

    if (!fnGlobMatch(entry.name, pattern)) continue;

    nodes.push({
      name: entry.name,
      path: entryPath,
      is_dir: false,
      children: [],
    });
  }

  return [nodes, null];
}

export { fxFilesFilesystem };
