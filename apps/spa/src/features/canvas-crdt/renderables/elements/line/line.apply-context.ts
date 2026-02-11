import type { TApplyContext } from "../rect/rect.apply-context"
import type { TLineData } from "@vibecanvas/shell/automerge/index"

/**
 * Line-specific apply context with points array.
 */
export type TLineApplyContext = TApplyContext<TLineData> & {
  /** Callback to update edit mode visibility */
  setEditMode: (value: boolean) => void
}
