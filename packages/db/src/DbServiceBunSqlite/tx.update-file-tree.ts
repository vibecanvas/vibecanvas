import { eq } from 'drizzle-orm';
import type { TFileTreeRecord, TUpdateFileTreeArgs } from '../IDbService';
import * as schema from '../schema';
import type { TDrizzleDb } from './index';

type TPortal = {
  drizzle: TDrizzleDb;
};

function txUpdateFileTree(portal: TPortal, args: TUpdateFileTreeArgs): TFileTreeRecord | null {
  const result = portal.drizzle
    .update(schema.filetrees)
    .set({
      updated_at: new Date(),
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.path !== undefined ? { path: args.path } : {}),
      ...(args.locked !== undefined ? { locked: args.locked } : {}),
      ...(args.glob_pattern !== undefined ? { glob_pattern: args.glob_pattern } : {}),
    })
    .where(eq(schema.filetrees.id, args.id))
    .returning()
    .all();

  return result[0] ?? null;
}

export { txUpdateFileTree };
