import type { Repo } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/types/canvas-doc";
import type db from "@vibecanvas/shell/database/db";
import * as schema from "@vibecanvas/shell/database/schema";
import { eq } from "drizzle-orm";
import { createElement } from "../automerge/fn.create-element";

export type TPortal = {
  db: typeof db;
  repo: Repo
};

export type TArgs = {
  canvas_id: string;
  title: string;
  path: string;
  locked?: boolean;
  glob_pattern?: string | null;
  x: number;
  y: number;
};

type TFiletree = typeof schema.filetrees.$inferSelect;

function createFileTreeElement(id: string, x: number, y: number) {
  const data = {
    type: 'filetree' as const,
    w: 360,
    h: 460,
    isCollapsed: false,
    globPattern: null,
  }
  const style = {
    backgroundColor: '#f8f9fa',
    strokeColor: '#ced4da',
    strokeWidth: 1,
    opacity: 1,
  }
  return createElement(id, x, y, data, style)
}

export async function ctrlCreateFiletree(portal: TPortal, args: TArgs): Promise<TErrTuple<TFiletree>> {
  try {
    const canvas = portal.db.query.canvas.findFirst({ where: eq(schema.canvas.id, args.canvas_id) }).sync()
    if (!canvas) {
      return [null, { code: "CTRL.FILETREE.CREATE_FILETREE.CANVAS_NOT_FOUND", statusCode: 404, externalMessage: { en: "Canvas not found" } }];
    }

    const filetreeData = {
      id: crypto.randomUUID(),
      canvas_id: args.canvas_id,
      path: args.path,
      title: args.title,
      locked: args.locked ?? false,
      glob_pattern: args.glob_pattern ?? null,
    } as const;
    const filetree = portal.db.insert(schema.filetrees).values(filetreeData).returning().all()[0]!;

    try {
      const handle = await portal.repo.find<TCanvasDoc>(canvas.automerge_url as any)
      handle.change(doc => {
        doc.elements[filetree.id] = createFileTreeElement(filetree.id, args.x, args.y)
      })
    } catch (error) {
      portal.db.delete(schema.filetrees).where(eq(schema.filetrees.id, filetree.id)).run()
      return [null, { code: "CTRL.FILETREE.CREATE_FILETREE.FAILED", statusCode: 500, externalMessage: { en: "Failed to create filetree" } }];
    }

    return [filetree, null];
  } catch (error) {
    console.error(error);
    return [null, { code: "CTRL.FILETREE.CREATE_FILETREE.FAILED", statusCode: 500, externalMessage: { en: "Failed to create filetree" } }];
  }
}
