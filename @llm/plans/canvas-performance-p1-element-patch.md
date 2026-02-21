# Sub-Plan: Element Patch Conditional Redraw

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P1-5:** Unconditional redraw on CRDT patches  
**File:** `element.patch.ts:154`

---

## Problem Statement

Every CRDT patch triggers a full redraw of affected elements, even if the patch only changed non-visual properties (like `id`, `version`, or metadata).

### Current Code
```typescript
function handleElementUpdated(canvas: Canvas, doc: TCanvasDoc, elementId: string, patches: Patch[]): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return
  
  const newData = doc.elements[elementId]
  if (!newData) return
  
  // Sync element data reference
  renderable.element = newData as any
  
  // ALWAYS redraws, even for non-visual changes
  renderable.redraw()
}
```

---

## Solution Overview

Analyze patches to determine if visual properties changed before triggering redraw. Only redraw when visual properties (`x`, `y`, `w`, `h`, `rx`, `ry`, `angle`, `style`, `data`) are modified.

---

## Implementation Steps

### Step 1: Define Visual Properties
Create a set of properties that affect visual rendering.

```typescript
// Properties that require a redraw when changed
const VISUAL_PROPERTIES = new Set([
  'x', 'y', 'w', 'h', 'rx', 'ry', 'angle', 'style', 'data'
])

// Properties that only need position update (no redraw)
const POSITION_PROPERTIES = new Set(['x', 'y', 'angle'])

// Properties that require full redraw
const GEOMETRY_PROPERTIES = new Set(['w', 'h', 'rx', 'ry', 'data'])
```

### Step 2: Patch Analysis Helper
Create a function to analyze patches and determine required updates.

```typescript
interface PatchAnalysis {
  needsRedraw: boolean
  needsPositionUpdate: boolean
  changedProperties: Set<string>
}

function analyzePatches(patches: Patch[]): PatchAnalysis {
  const changedProperties = new Set<string>()
  
  for (const patch of patches) {
    // Patch path format: ['elements', elementId, propertyName, ...]
    if (patch.path.length >= 3 && patch.path[0] === 'elements') {
      const property = patch.path[2] as string
      changedProperties.add(property)
    }
  }
  
  const visualChanges = [...changedProperties].filter(p => VISUAL_PROPERTIES.has(p))
  const positionChanges = visualChanges.filter(p => POSITION_PROPERTIES.has(p))
  const geometryChanges = visualChanges.filter(p => GEOMETRY_PROPERTIES.has(p))
  
  return {
    needsRedraw: geometryChanges.length > 0 || changedProperties.has('style'),
    needsPositionUpdate: positionChanges.length > 0,
    changedProperties,
  }
}
```

### Step 3: Optimized handleElementUpdated
```typescript
function handleElementUpdated(
  canvas: Canvas,
  doc: TCanvasDoc,
  elementId: string,
  patches: Patch[]
): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return
  
  const newData = doc.elements[elementId]
  if (!newData) return
  
  // Analyze patches to determine what needs updating
  const analysis = analyzePatches(patches)
  
  // Sync element data reference
  renderable.element = newData as any
  
  // Handle special element types
  if (newData.data.type === 'pen') {
    renderable.container.rotation = newData.angle
    if (analysis.needsRedraw) renderable.redraw()
    return
  }
  
  if (newData.data.type === 'line' || newData.data.type === 'arrow') {
    renderable.container.rotation = newData.angle
    if (analysis.needsRedraw) renderable.redraw()
    return
  }
  
  // Handle other elements
  const w = 'w' in newData.data ? newData.data.w :
    'rx' in newData.data ? newData.data.rx * 2 : 0
  const h = 'h' in newData.data ? newData.data.h :
    'ry' in newData.data ? newData.data.ry * 2 : 0
  
  // Always update position (cheap)
  renderable.container.x = newData.x + w / 2
  renderable.container.y = newData.y + h / 2
  renderable.container.rotation = newData.angle
  
  // Only redraw if visual properties changed
  if (analysis.needsRedraw) {
    renderable.redraw()
  }
  
  // Update transform box if visible and needed
  if (renderable.transformBox?.container.visible && 
      (analysis.needsRedraw || analysis.needsPositionUpdate)) {
    renderable.transformBox.redraw()
  }
}
```

### Step 4: Batch Patch Processing
Optimize handling of multiple patches in a single batch.

```typescript
function handlePatches(canvas: Canvas, doc: TCanvasDoc, patches: Patch[]): void {
  // Group patches by element
  const patchesByElement = new Map<string, Patch[]>()
  
  for (const patch of patches) {
    if (patch.path[0] === 'elements' && typeof patch.path[1] === 'string') {
      const elementId = patch.path[1]
      if (!patchesByElement.has(elementId)) {
        patchesByElement.set(elementId, [])
      }
      patchesByElement.get(elementId)!.push(patch)
    }
  }
  
  // Process each element once with all its patches
  for (const [elementId, elementPatches] of patchesByElement) {
    handleElementUpdated(canvas, doc, elementId, elementPatches)
  }
}
```

### Step 5: Handle Special Cases
Ensure edge cases are handled correctly.

```typescript
function handleElementUpdated(
  canvas: Canvas,
  doc: TCanvasDoc,
  elementId: string,
  patches: Patch[]
): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return
  
  const newData = doc.elements[elementId]
  if (!newData) {
    // Element was deleted
    renderable.destroy()
    canvas.elements.delete(elementId)
    return
  }
  
  const analysis = analyzePatches(patches)
  const oldType = renderable.element.data.type
  const newType = newData.data.type
  
  // Type change requires full reconstruction
  if (oldType !== newType) {
    renderable.destroy()
    const newRenderable = createRenderable(canvas, newData)
    canvas.elements.set(elementId, newRenderable)
    return
  }
  
  // Sync element data
  renderable.element = newData as any
  
  // Apply updates based on analysis
  if (analysis.needsPositionUpdate || analysis.needsRedraw) {
    updateRenderablePosition(renderable, newData)
  }
  
  if (analysis.needsRedraw) {
    renderable.redraw()
  }
  
  // Update selection state if needed
  if (analysis.changedProperties.has('isSelected')) {
    renderable.isSelected = newData.isSelected ?? false
  }
}
```

---

## Testing Checklist

- [ ] Element updates when position changes
- [ ] Element updates when size changes
- [ ] Element updates when style changes
- [ ] Element updates when text content changes
- [ ] No redraw when only metadata changes
- [ ] No redraw when only `id` or `version` changes
- [ ] Batch patches are processed correctly
- [ ] Element type change triggers reconstruction
- [ ] Element deletion is handled correctly

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Metadata-only patch | 1 redraw | 0 redraws | 100% reduction |
| Position-only patch | 1 redraw | Position update only | ~80% reduction |
| Style change | 1 redraw | 1 redraw | No change (correct) |
| Batch patches | N redraws | 1 redraw | ~70% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/canvas/element.patch.ts`

## Estimated Effort

1-2 days (including testing)
