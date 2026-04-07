import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import type { TDrizzleDb } from './index';

type TPortal = {
  drizzle: TDrizzleDb;
};

function txDeleteFileTree(portal: TPortal, id: string): boolean {
  const result = portal.drizzle
    .delete(schema.filetrees)
    .where(eq(schema.filetrees.id, id))
    .returning({ id: schema.filetrees.id })
    .all();

  return result.length > 0;
}

export { txDeleteFileTree };
