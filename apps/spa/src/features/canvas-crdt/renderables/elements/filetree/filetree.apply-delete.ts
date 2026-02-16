import { showErrorToast } from "@/components/ui/Toast";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import { Change } from "@/features/canvas-crdt/types/changes";
import type { TChanges } from "@/features/canvas-crdt/types/changes";
import type { TApplyContext } from "../rect/rect.apply-context";

export function applyDelete(ctx: TApplyContext<any>): TChanges {
  ctx.canvas.removeElement(ctx.id);

  orpcWebsocketService.safeClient.api.filetree.remove({ params: { id: ctx.id } }).then(([err]) => {
    if (err) {
      showErrorToast(err.message);
    }
  });

  return {
    action: { type: "delete" },
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [Change.delete(["elements", ctx.id])],
  };
}
