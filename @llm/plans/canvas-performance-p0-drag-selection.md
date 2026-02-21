# Sub-Plan: Drag Selection Container Transforms

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P0-3:** Excessive redraws during drag operations  
**File:** `cmd.drag-selection.ts:224-234`

---

## Problem Statement

During `pointermove`, VirtualGroup and MultiTransformBox are redrawn EVERY frame. This causes severe FPS drops when dragging multiple elements.

### Current Code
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

---

## Solution Overview

Use container position transforms during drag operations instead of full redraws. Only compute bounds and redraw on `pointerup`.

---

## Implementation Steps

### Step 1: Modify handleMove Function
Update to use container transforms instead of redraws.

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

### Step 2: Modify handleUp Function
Add final redraw on pointer up.

```typescript
function handleUp(ctx: PointerInputContext): boolean {
  const wasDragging = state.isDragging
  
  if (wasDragging && state.targets.length > 0) {
    // Commit final positions to CRDT
    const patches: Patch[] = []
    
    for (const target of state.targets) {
      if (isVirtualGroupTarget(target as TCommandTarget)) {
        const vg = target as VirtualGroup
        const deltaX = vg.container.x - vg.element.x
        const deltaY = vg.container.y - vg.element.y
        
        // Apply final position to CRDT
        for (const member of vg.members) {
          patches.push({
            action: 'put',
            path: ['elements', member.id, 'x'],
            value: member.element.x + deltaX,
          })
          patches.push({
            action: 'put',
            path: ['elements', member.id, 'y'],
            value: member.element.y + deltaY,
          })
        }
      } else {
        const element = target as ElementRenderable
        patches.push({
          action: 'put',
          path: ['elements', element.id, 'x'],
          value: element.element.x,
        })
        patches.push({
          action: 'put',
          path: ['elements', element.id, 'y'],
          value: element.element.y,
        })
      }
    }
    
    // Apply patches
    if (patches.length > 0) {
      ctx.canvas.patchDoc(patches)
    }
  }
  
  // Only now do we compute bounds and redraw
  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()
  }
  
  // Also redraw any VirtualGroups to ensure correct state
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      const vg = target as VirtualGroup
      vg.redraw()
    }
  }
  
  resetState()
  return wasDragging
}
```

### Step 3: Add State Tracking
Ensure state tracks initial positions for proper delta calculation.

```typescript
type TDragState = {
  isDragging: boolean
  targets: TCommandTarget[]
  lastWorld: Point | null
  startPositions: Map<string, Point> // Track initial positions
}

const state: TDragState = {
  isDragging: false,
  targets: [],
  lastWorld: null,
  startPositions: new Map(),
}

function handleDown(ctx: PointerInputContext): boolean {
  // ... existing selection logic ...
  
  // Store initial positions
  state.startPositions.clear()
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      const vg = target as VirtualGroup
      state.startPositions.set(vg.id, new Point(vg.container.x, vg.container.y))
    } else {
      const element = target as ElementRenderable
      state.startPositions.set(element.id, new Point(element.container.x, element.container.y))
    }
  }
  
  return true
}
```

### Step 4: Handle Cancel/Edge Cases
Ensure proper cleanup on drag cancel.

```typescript
function resetState(): void {
  // Reset container positions to match element data
  for (const [id, startPos] of state.startPositions) {
    const target = state.targets.find(t => t.id === id)
    if (target) {
      if (isVirtualGroupTarget(target as TCommandTarget)) {
        const vg = target as VirtualGroup
        // Reset to CRDT state
        vg.container.x = vg.element.x
        vg.container.y = vg.element.y
      }
    }
  }
  
  state.isDragging = false
  state.targets = []
  state.lastWorld = null
  state.startPositions.clear()
}
```

---

## Testing Checklist

- [ ] Drag single element works smoothly
- [ ] Drag multiple elements works smoothly
- [ ] Drag VirtualGroup works smoothly
- [ ] Mixed selection (elements + groups) works
- [ ] Dragging ends at correct position
- [ ] TransformBox updates correctly after drag
- [ ] MultiTransformBox updates correctly after drag
- [ ] Rapid drag operations don't cause visual glitches
- [ ] Drag cancel (Escape key) resets correctly

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Drag 50 elements | 15-20 FPS | 50-60 FPS | 150-200% |
| Drag VirtualGroup | 10-15 FPS | 55-60 FPS | 300-400% |
| Drag with MultiTransformBox | 10-15 FPS | 55-60 FPS | 300-400% |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/input-commands/cmd.drag-selection.ts`

## Estimated Effort

2-3 days (including testing and edge case handling)
