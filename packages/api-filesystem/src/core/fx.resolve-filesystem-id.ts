import type { TFilesystemApiContext } from '../types';

type TPortalFilesystemId = {
  db: TFilesystemApiContext['db'];
};

type TArgsFilesystemId = {
  filesystemId?: string;
};

export function fxResolveFilesystemId(portal: TPortalFilesystemId, args: TArgsFilesystemId): string | null {
  if (args.filesystemId) return args.filesystemId;

  const local = portal.db.filesystem.listAll().find((entry) => entry.kind === 'local');
  if (local) return local.id;

  return null;
}
