import type { DocHandle } from '@automerge/automerge-repo';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TCanvasDoc } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { TCanvasRecord } from '@vibecanvas/db/IDbService';

type TPortal = {
  automergeService: IAutomergeService;
};

export async function fxLoadCanvasHandleDoc(portal: TPortal, row: TCanvasRecord): Promise<{ handle: DocHandle<TCanvasDoc>; doc: TCanvasDoc }> {
  const handle = await portal.automergeService.repo.find<TCanvasDoc>(row.automerge_url as never);
  await handle.whenReady();
  const currentDoc = handle.doc();
  if (!currentDoc) throw new Error(`Canvas doc '${row.automerge_url}' is unavailable.`);
  return {
    handle,
    doc: structuredClone(currentDoc),
  };
}
