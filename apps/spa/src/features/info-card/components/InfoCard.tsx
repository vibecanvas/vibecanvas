import { store } from "@/store"
import { Button } from "@kobalte/core/button"

export function InfoCard() {
  return (
    <div class="absolute bottom-0 right-0 p-2 m-1 bg-primary/10 border rounded text-xs font-mono space-y-1 min-w-35">
      {/* Input Detection State */}
      <div class="border-b pb-1 mb-1">
        <div>
          <span class="text-gray-500">Tool:</span>
          <span class="pl-1 font-semibold">{store.toolbarSlice.activeTool}</span>
        </div>
        <div>
          <span class="text-gray-500">Position:</span>
          <span class="pl-1">{store.canvasSlice.canvasViewportActive?.x.toFixed(0)}, {store.canvasSlice.canvasViewportActive?.y.toFixed(0)}</span>
        </div>
        <div>
          <span class="text-gray-500">Zoom:</span>
          <span class="pl-1">{store.canvasSlice.canvasViewportActive?.scale.toFixed(2)}</span>
        </div>
        <div>
          <span class="text-gray-500">Selected:</span>
          <span class="pl-1">{store.canvasSlice.selectedIds.map(id => id.substring(0, 8)).join(', ')}</span>
        </div>
        <div>
          <span class="text-gray-500">Mouse Position:</span>
          <span class="pl-1">{store.canvasSlice.mousePositionWorldSpace.x.toFixed(0)}, {store.canvasSlice.mousePositionWorldSpace.y.toFixed(0)}</span>
        </div>
        <div>
          <Button class="bg-secondary p-1 hover:bg-secondary/75 cursor-pointer" onclick={e => {
            // @ts-ignore hacky way to clear the canvas fine for debugging
            window.handle.change(doc => {
              doc.elements = {}
              doc.groups = {}
            })
          }}>Clear Canvas</Button>
        </div>
      </div>

    </div>
  )
}
