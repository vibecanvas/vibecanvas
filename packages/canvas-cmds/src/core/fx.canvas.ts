import type { DocHandle } from '@automerge/automerge-repo';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TCanvasDoc } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { TCanvasRecord } from '@vibecanvas/db/IDbService';

type TPortal = {
  automergeService: IAutomergeService;
};

export async function fxLoadCanvasHandleDoc(portal: TPortal, row: TCanvasRecord): Promise<{ handle: DocHandle<TCanvasDoc>; doc: TCanvasDoc }> {
  let handle: DocHandle<TCanvasDoc>;
  try {
    handle = await portal.automergeService.repo.find<TCanvasDoc>(row.automerge_url as never);
  } catch {
    throw new Error(`Canvas doc '${row.name}' (${row.automerge_url}) is unavailable. Canvas row exists, but Automerge storage could not load the document.`);
  }

  await handle.whenReady();

  const currentDoc = handle.doc();
  if (!currentDoc) {
    throw new Error(`Canvas doc '${row.name}' (${row.automerge_url}) is unavailable after readiness.`);
  }

  return {
    handle,
    doc: structuredClone(currentDoc),
  };
}
