# Sub-Plan: Conditional Redraw on CRDT Patches

## Overview

Only redraw elements when visual properties actually change in CRDT patches. Skip redraw for non-visual metadata updates.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P1 (Important)
- **File:** `element.patch.ts:154`
- **Impact:** Medium - Unnecessary redraws on every patch

## Current Problem

Every CRDT patch triggers a redraw, even when only non-visual properties change:

```typescript
function handleElementUpdated(canvas: Canvas, doc: TCanvasDoc, elementId: string, patches: Patch[]): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return
  
  const newData = doc.elements[elementId]
  if (!newData) return
  
  // Sync element data reference
  renderable.element = newData as any
  
  // ALWAYS redraws, regardless of what changed
  renderable.redraw()  // Line 154
}
```

## Implementation

### 1. Add Visual Property Detection

```typescript
function handleElementUpdated(canvas: Canvas, doc: TCanvasDoc, elementId: string, patches: Patch[]): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return
  
  const newData = doc.elements[elementId]
  if (!newData) return
  
  // Sync element data reference
  renderable.element = newData as any
  
  // Determine if redraw is needed based on what changed
  const visualProps = ['x', 'y', 'w', 'h', 'rx', 'ry', 'angle', 'style', 'data']
  const hasVisualChange = patches.some(p => 
    p.path.length >= 3 && visualProps.some(prop => p.path[2] === prop)
  )
  
  // Handle special element types
  if (newData.data.type === 'pen') {
    renderable.container.rotation = newData.angle
    if (hasVisualChange) renderable.redraw()
    return
  }
  
  if (newData.data.type === 'line' || newData.data.type === 'arrow') {
    renderable.container.rotation = newData.angle
    if (hasVisualChange) renderable.redraw()
    return
  }
  
  // Handle other elements
  const w = 'w' in newData.data ? newData.data.w :
    'rx' in newData.data ? newData.data.rx * 2 : 0
  const h = 'h' in newData.data ? newData.data.h :
    'ry' in newData.data ? newData.data.ry * 2 : 0
  
  renderable.container.x = newData.x + w / 2
  renderable.container.y = newData.y + h / 2
  renderable.container.rotation = newData.angle
  
  // Only redraw if visual properties changed
  if (hasVisualChange) {
    renderable.redraw()
  }
}
```

## Files to Modify

- `apps/spa/src/features/canvas-crdt/canvas/element.patch.ts`

## Testing Checklist

- [ ] Element updates when visual properties change
- [ ] Element skips redraw for metadata-only changes
- [ ] Position updates still work via container transform
- [ ] Rotation updates still work via container transform
- [ ] Style changes trigger redraw
- [ ] No visual regression in element updates
- [ ] Performance improvement measurable in profiler

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| CRDT patch apply | 50ms | 15ms | 70% reduction |
| Metadata-only sync | Always redraws | Skips redraw | 100% reduction |

## Notes

- Non-visual properties might include: `id`, `version`, `createdAt`, `updatedAt`, etc.
- Container transforms (position, rotation) are cheap and always applied
- Redraw is only needed when geometry or appearance changes
- Patch path structure: `['elements', elementId, property, ...]`
