import type { TCreateFileTreeArgs, TFileTreeRecord } from '../IDbService';
import * as schema from '../schema';
import type { TDrizzleDb } from './index';

type TPortal = {
  drizzle: TDrizzleDb;
};

function txCreateFileTree(portal: TPortal, args: TCreateFileTreeArgs): TFileTreeRecord {
  const now = new Date();
  const result = portal.drizzle
    .insert(schema.filetrees)
    .values({
      id: crypto.randomUUID(),
      canvas_id: args.canvas_id,
      title: args.title,
      path: args.path,
      locked: args.locked ?? false,
      glob_pattern: args.glob_pattern ?? null,
      created_at: now,
      updated_at: now,
    })
    .returning()
    .all();

  return result[0]!;
}

export { txCreateFileTree };
