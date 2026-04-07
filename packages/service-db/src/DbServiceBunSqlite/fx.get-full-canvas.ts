import { eq } from 'drizzle-orm';
import type { TGetFullCanvasResult } from '../IDbService';
import * as schema from '../schema';
import type { TDrizzleDb } from './index';

type TPortal = {
  drizzle: TDrizzleDb;
};

function fxGetFullCanvas(portal: TPortal, id: string): TGetFullCanvasResult | null {
  const canvas = portal.drizzle.query.canvas.findFirst({
    where: eq(schema.canvas.id, id),
  }).sync();

  if (!canvas) {
    return null;
  }

  const fileTrees = portal.drizzle.query.filetrees.findMany({
    where: eq(schema.filetrees.canvas_id, id),
  }).sync();

  return {
    canvas,
    fileTrees,
  };
}

export { fxGetFullCanvas };
