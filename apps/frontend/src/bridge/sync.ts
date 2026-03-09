import type { DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/shell/automerge/index";

export type BridgeHandle = {
  cleanup: () => void;
};

export function initBridge(handle: DocHandle<TCanvasDoc>): BridgeHandle {
  const doc = handle.doc();
  if (!doc) {
    console.warn("[Bridge] No document found on handle");
    return { cleanup: () => {} };
  }

  // Load all elements from the CRDT document
  const elements = Object.values(doc.elements);
  console.log(`[Bridge] Loaded ${elements.length} elements from CRDT`);

  for (const element of elements) {
    console.log(`[Bridge]   ${element.data.type} id=${element.id} at (${element.x}, ${element.y})`);
  }

  // TODO: Phase 1 — convert elements to ECS nodes and spawn them

  // Listen for remote CRDT changes
  const onChange = (payload: DocHandleChangePayload<TCanvasDoc>) => {
    const updatedDoc = handle.doc();
    if (!updatedDoc) return;

    console.log(`[Bridge] CRDT change received, ${payload.patches.length} patches`);

    // TODO: Phase 2 — apply patches to ECS (create/update/delete nodes)
  };

  handle.on("change", onChange);

  return {
    cleanup: () => {
      handle.off("change", onChange);
      console.log("[Bridge] Cleaned up");
    },
  };
}
