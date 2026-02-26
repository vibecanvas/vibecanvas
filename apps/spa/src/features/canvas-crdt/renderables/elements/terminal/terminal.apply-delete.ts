import { Change } from "@/features/canvas-crdt/types/changes";
import type { TChanges } from "@/features/canvas-crdt/types/changes";
import type { TApplyContext } from "../rect/rect.apply-context";

export function applyDelete(ctx: TApplyContext<any>): TChanges {
  ctx.canvas.removeElement(ctx.id);

  return {
    action: { type: "delete" },
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [Change.delete(["elements", ctx.id])],
  };
}
