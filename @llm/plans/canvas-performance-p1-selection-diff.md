# Sub-Plan: Selection Effect Diffing

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P1-6:** Selection effect full reset  
**File:** `setup.doc-sync.ts:150-234`

---

## Problem Statement

Every selection change resets all selection effects and rebuilds them from scratch, even if only one element was added or removed from the selection.

### Current Code Pattern
```typescript
const listenLocalStore = (canvas: Canvas) => {
  const dispose = createRoot((dispose) => {
    createEffect(() => {
      const selectedIds = store.canvasSlice.selectedIds
      
      // FULL RESET every time
      // 1. Deselect everything
      for (const element of canvas.elements.values()) {
        element.isSelected = false
      }
      for (const group of canvas.groupManager.groups.values()) {
        group.deselect()
      }
      
      // 2. Rebuild selection from scratch
      // ... rebuild logic
    })
    
    return dispose
  })
  
  return dispose
}
```

---

## Solution Overview

Diff the previous selection with the current selection and only update the changed items (added/removed).

---

## Implementation Steps

### Step 1: Track Previous Selection
Add state to track the previous selection for comparison.

```typescript
const listenLocalStore = (canvas: Canvas) => {
  let previousSelectedIds: Set<string> = new Set()
  
  const dispose = createRoot((dispose) => {
    createEffect(() => {
      const selectedIds = store.canvasSlice.selectedIds
      const currentIds = new Set(selectedIds)
      
      // Find what changed
      const added = new Set([...currentIds].filter(id => !previousSelectedIds.has(id)))
      const removed = new Set([...previousSelectedIds].filter(id => !currentIds.has(id)))
      
      // Only update changed items
      updateSelectionChanges(canvas, added, removed, currentIds)
      
      previousSelectedIds = currentIds
    })
    
    return dispose
  })
  
  return dispose
}
```

### Step 2: Incremental Update Function
Create a function to handle only the changed selection items.

```typescript
function updateSelectionChanges(
  canvas: Canvas,
  added: Set<string>,
  removed: Set<string>,
  currentIds: Set<string>
): void {
  // Handle removed items
  for (const id of removed) {
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      group.deselect()
      // Also deselect members
      for (const member of group.members) {
        member.isSelected = false
        if (member.transformBox) {
          member.transformBox.setMode('hidden')
        }
      }
    } else {
      const element = canvas.elements.get(id)
      if (element) {
        element.isSelected = false
        if (element.transformBox) {
          element.transformBox.setMode('hidden')
        }
      }
    }
  }
  
  // Handle single selection
  if (currentIds.size === 1) {
    const id = [...currentIds][0]
    const virtualGroup = canvas.groupManager.groups.get(id)
    
    if (virtualGroup) {
      // Select virtual group
      virtualGroup.transformBox?.setMode('full')
      virtualGroup.select()
      
      // Show frame mode for members
      for (const member of virtualGroup.members) {
        if (member.transformBox) {
          member.transformBox.setMode('frame')
        }
        member.isSelected = true
      }
      canvas.multiTransformBox.hide()
    } else {
      const element = canvas.elements.get(id)
      if (element) {
        if (element.transformBox) {
          element.transformBox.setMode('full')
        }
        element.isSelected = true
      }
      canvas.multiTransformBox.hide()
    }
  } else if (currentIds.size > 1) {
    // Handle multi-selection
    handleMultiSelection(canvas, currentIds, added)
  } else {
    // No selection
    canvas.multiTransformBox.hide()
  }
}
```

### Step 3: Optimized Multi-Selection
Handle multi-selection with minimal updates.

```typescript
function handleMultiSelection(
  canvas: Canvas,
  currentIds: Set<string>,
  added: Set<string>
): void {
  // For newly added items, set to frame mode
  for (const id of added) {
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      // Virtual groups in multi-selection get frame mode
      group.transformBox?.setMode('frame')
      group.select()
    } else {
      const element = canvas.elements.get(id)
      if (element) {
        if (element.transformBox) {
          element.transformBox.setMode('frame')
        }
        element.isSelected = true
      }
    }
  }
  
  // Compute bounds for multi-transform box
  const bounds = computeSelectionBounds(canvas, currentIds)
  canvas.multiTransformBox.setBounds(bounds)
  canvas.multiTransformBox.show()
  canvas.multiTransformBox.redraw()
}

function computeSelectionBounds(canvas: Canvas, ids: Set<string>): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const id of ids) {
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      const b = group.localBounds
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    } else {
      const element = canvas.elements.get(id)
      if (element) {
        const b = element.localBounds
        minX = Math.min(minX, b.x)
        minY = Math.min(minY, b.y)
        maxX = Math.max(maxX, b.x + b.width)
        maxY = Math.max(maxY, b.y + b.height)
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
```

### Step 4: Handle Edge Cases
Ensure proper handling of special cases.

```typescript
function updateSelectionChanges(
  canvas: Canvas,
  added: Set<string>,
  removed: Set<string>,
  currentIds: Set<string>
): void {
  // If going from multi to single selection, reset all first
  if (previousSelectedIds.size > 1 && currentIds.size === 1) {
    // Full reset needed for mode changes
    fullSelectionReset(canvas)
  }
  
  // If going from single to multi, update modes
  if (previousSelectedIds.size === 1 && currentIds.size > 1) {
    const singleId = [...previousSelectedIds][0]
    const element = canvas.elements.get(singleId)
    if (element?.transformBox) {
      element.transformBox.setMode('frame')
    }
  }
  
  // Normal incremental update
  // ... rest of implementation
}

function fullSelectionReset(canvas: Canvas): void {
  // Deselect all elements
  for (const element of canvas.elements.values()) {
    element.isSelected = false
    element.transformBox?.setMode('hidden')
  }
  
  // Deselect all groups
  for (const group of canvas.groupManager.groups.values()) {
    group.deselect()
  }
}
```

### Step 5: Optimize Effect Dependencies
Ensure the effect only runs when selection actually changes.

```typescript
const listenLocalStore = (canvas: Canvas) => {
  let previousSelectedIds: Set<string> = new Set()
  
  const dispose = createRoot((dispose) => {
    createEffect(
      // Use memo to prevent unnecessary runs
      on(
        () => store.canvasSlice.selectedIds,
        (selectedIds) => {
          const currentIds = new Set(selectedIds)
          
          // Early exit if no change
          if (setsAreEqual(currentIds, previousSelectedIds)) {
            return
          }
          
          const added = new Set([...currentIds].filter(id => !previousSelectedIds.has(id)))
          const removed = new Set([...previousSelectedIds].filter(id => !currentIds.has(id)))
          
          updateSelectionChanges(canvas, added, removed, currentIds)
          previousSelectedIds = currentIds
        },
        { defer: true }
      )
    )
    
    return dispose
  })
  
  return dispose
}

function setsAreEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}
```

---

## Testing Checklist

- [ ] Single element selection works
- [ ] Multi-element selection works
- [ ] Virtual group selection works
- [ ] Mixed selection (elements + groups) works
- [ ] Adding to selection works incrementally
- [ ] Removing from selection works incrementally
- [ ] Clear selection works
- [ ] TransformBox modes update correctly
- [ ] MultiTransformBox shows/hides correctly
- [ ] Rapid selection changes don't cause visual glitches

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Add one to selection | Full reset | 1 item update | ~90% reduction |
| Remove one from selection | Full reset | 1 item update | ~90% reduction |
| Clear selection | Full reset | N item updates | ~50% reduction |
| Complex multi-selection | Full reset | Incremental | ~70% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/canvas/setup.doc-sync.ts`

## Estimated Effort

2-3 days (including testing and edge case handling)
