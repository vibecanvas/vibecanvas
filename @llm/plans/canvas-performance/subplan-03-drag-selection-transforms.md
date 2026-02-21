# Sub-Plan: Drag Selection Container Transforms

## Overview

Use container position transforms during drag operations instead of redrawing every frame. Only redraw on `pointerup` when the drag completes.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P0 (Critical)
- **File:** `cmd.drag-selection.ts:224-234`
- **Impact:** High - Redrawing every frame during drag kills performance

## Current Problem

During `pointermove`, VirtualGroup and MultiTransformBox are redrawn EVERY frame:

```typescript
function handleMove(ctx: PointerInputContext): boolean {
  // ...
  
  // Update transform boxes - EVERY FRAME
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      ;(target as VirtualGroup).redraw()  // Called every frame!
    }
  }
  
  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()  // Called every frame!
  }
  
  return true
}
```

## Implementation

### 1. Optimized handleMove()

```typescript
function handleMove(ctx: PointerInputContext): boolean {
  if (!selectCmdState.mouseDownWorld || !ctx.worldPos || !state.lastWorld) return false
  if (state.targets.length === 0) return false
  if (!state.isDragging && isThresholdReached(ctx)) {
    state.isDragging = true
  }
  if (!state.isDragging) return false
  
  // Calculate delta
  const deltaX = ctx.worldPos.x - state.lastWorld.x
  const deltaY = ctx.worldPos.y - state.lastWorld.y
  state.lastWorld = ctx.worldPos
  
  // Dispatch move for visual update (updates container position)
  for (const target of state.targets) {
    target.dispatch({ type: 'move', delta: new Point(deltaX, deltaY) })
  }
  
  // For VirtualGroups: update container position directly instead of redraw
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      const vg = target as VirtualGroup
      // Just update container position - no redraw needed
      vg.container.x += deltaX
      vg.container.y += deltaY
    }
  }
  
  // For multi-selection: update MultiTransformBox position directly
  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.container.x += deltaX
    ctx.canvas.multiTransformBox.container.y += deltaY
    // NO computeGroupBounds() or redraw() during drag
  }
  
  return true
}
```

### 2. Optimized handleUp()

```typescript
function handleUp(ctx: PointerInputContext): boolean {
  // ... existing code ...
  
  // Only now do we compute bounds and redraw
  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()
  }
  
  // Also redraw any VirtualGroups to ensure correct state
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      ;(target as VirtualGroup).redraw()
    }
  }
  
  resetState()
  return wasDragging
}
```

## Files to Modify

- `apps/spa/src/features/canvas-crdt/input-commands/cmd.drag-selection.ts`

## Testing Checklist

- [ ] Single element drag works correctly
- [ ] Multi-selection drag works correctly
- [ ] VirtualGroup drag works correctly
- [ ] Selection box follows elements during drag
- [ ] Elements snap to correct position on pointerup
- [ ] No visual glitches during drag
- [ ] Performance improvement measurable in profiler

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Drag 50 elements | 15-20 FPS | 50-60 FPS | 150-200% |
| Drag with VirtualGroups | 10-15 FPS | 50-60 FPS | 200-300% |

## Notes

- Container position updates are GPU-accelerated and very cheap
- The visual feedback during drag is identical - just more performant
- Final redraw on pointerup ensures correct state for subsequent operations
- This pattern should be applied to other continuous interactions (resize, rotate)
