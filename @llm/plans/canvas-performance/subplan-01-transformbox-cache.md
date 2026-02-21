# Sub-Plan: TransformBox Graphics Caching

## Overview

Cache GraphicsContext objects in TransformBox to avoid rebuilding 9 Graphics objects (4 edges + 4 corners + rotation handle) on every redraw.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P0 (Critical)
- **File:** `transform-box.ts:275-363`
- **Impact:** High - Rebuilding 9 Graphics objects every frame during drag operations

## Current Problem

Each `redraw()` clears and rebuilds all Graphics objects from scratch:

```typescript
public redraw(): void {
  this.container.visible = false
  
  // Each edge is cleared and rebuilt
  this.topEdge.clear()
    .moveTo(0, 0)
    .lineTo(width, 0)
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
  // ... repeated for all 9 graphics objects
  
  this.container.visible = true
}
```

## Implementation

### 1. Add Caching Fields

```typescript
export class TransformBox implements IRenderable {
  private lastBoundsKey: string = ''
  private edgeContexts: Map<string, GraphicsContext> = new Map()
  private cornerContext: GraphicsContext | null = null
  
  private getBoundsKey(bounds: Bounds): string {
    return `${bounds.width.toFixed(2)}x${bounds.height.toFixed(2)}`
  }
```

### 2. Build Contexts Once

```typescript
private buildEdgeContexts(width: number, height: number, p: number): void {
  // Horizontal edges (shared context)
  const horizontalCtx = new GraphicsContext()
    .moveTo(0, 0)
    .lineTo(width + 2 * p, 0)
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
  
  // Vertical edges (shared context)  
  const verticalCtx = new GraphicsContext()
    .moveTo(0, 0)
    .lineTo(0, height + 2 * p)
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
  
  this.edgeContexts.set('horizontal', horizontalCtx)
  this.edgeContexts.set('vertical', verticalCtx)
}

private buildCornerContext(): void {
  const halfSize = CORNER_HANDLE_SIZE / 2
  this.cornerContext = new GraphicsContext()
    .rect(-halfSize, -halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
    .fill({ color: SELECTION_FILL })
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
}
```

### 3. Optimized redraw()

```typescript
public redraw(): void {
  const bounds = this.target.localBounds
  const p = SELECTION_PADDING
  const boundsKey = this.getBoundsKey(bounds)
  
  // Only rebuild contexts if bounds changed
  if (boundsKey !== this.lastBoundsKey) {
    this.buildEdgeContexts(bounds.width, bounds.height, p)
    if (!this.cornerContext) this.buildCornerContext()
    this.lastBoundsKey = boundsKey
    
    // Rebuild edge graphics with new contexts
    const hCtx = this.edgeContexts.get('horizontal')!
    const vCtx = this.edgeContexts.get('vertical')!
    
    this.topEdge = new Graphics(hCtx)
    this.topEdge.position.set(-p, -p)
    // ... etc
  }
  
  // Always update positions (cheap)
  this.updateHandlePositions(bounds)
  this.updateCursors()
}

private updateHandlePositions(bounds: Bounds): void {
  const p = SELECTION_PADDING
  const left = -p
  const top = -p
  const right = bounds.width + p
  const bottom = bounds.height + p
  
  // Just update positions, don't rebuild
  this.nwHandle.position.set(left, top)
  this.neHandle.position.set(right, top)
  this.seHandle.position.set(right, bottom)
  this.swHandle.position.set(left, bottom)
}
```

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/transform-box/transform-box.ts`

## Testing Checklist

- [ ] TransformBox renders correctly after initial creation
- [ ] TransformBox updates when element is resized
- [ ] TransformBox updates when element dimensions change
- [ ] Handle positions update correctly during drag
- [ ] No visual regression in selection appearance
- [ ] Performance improvement measurable in profiler

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Selection drag | 9 Graphics rebuilds/frame | 0-1 rebuilds/frame | ~90% reduction |
| Resize operation | 9 Graphics rebuilds/frame | 1 rebuild at end | ~95% reduction |

## Notes

- GraphicsContext objects are reusable across multiple Graphics instances
- Position updates via `position.set()` are much cheaper than rebuilding Graphics
- Cache key uses fixed precision to avoid floating point comparison issues
