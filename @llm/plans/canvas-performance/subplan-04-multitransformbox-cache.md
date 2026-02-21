# Sub-Plan: MultiTransformBox Dashed Line Caching

## Overview

Cache the dashed line GraphicsContext in MultiTransformBox to avoid rebuilding the selection frame geometry on every redraw.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P1 (Important)
- **File:** `multi-transform-box.ts:74-107`
- **Impact:** Medium-High - Dashed line calculation is expensive

## Current Problem

The dashed selection frame is rebuilt from scratch on every redraw, recalculating all dash segments.

## Implementation

### 1. Add Caching Fields

```typescript
export class MultiTransformBox implements IRenderable {
  private lastBoundsKey: string = ''
  private frameContext: GraphicsContext | null = null
```

### 2. Build Frame Context

```typescript
private buildFrameContext(b: Bounds, p: number): GraphicsContext {
  const ctx = new GraphicsContext()
  const x = b.x - p
  const y = b.y - p
  const w = b.width + 2 * p
  const h = b.height + 2 * p
  
  // Build dashed lines as a single path
  const segments = [
    // Top edge
    ...calculateDashedLineSegments(x, y, x + w, y, DASH_LENGTH, DASH_GAP),
    // Right edge
    ...calculateDashedLineSegments(x + w, y, x + w, y + h, DASH_LENGTH, DASH_GAP),
    // Bottom edge
    ...calculateDashedLineSegments(x + w, y + h, x, y + h, DASH_LENGTH, DASH_GAP),
    // Left edge
    ...calculateDashedLineSegments(x, y + h, x, y, DASH_LENGTH, DASH_GAP),
  ]
  
  for (const seg of segments) {
    ctx.moveTo(seg.startX, seg.startY)
    ctx.lineTo(seg.endX, seg.endY)
  }
  ctx.stroke({ color: SELECTION_COLOR, width: 1 })
  
  return ctx
}
```

### 3. Optimized redraw()

```typescript
public redraw(): void {
  const boundsKey = `${this._bounds.x},${this._bounds.y},${this._bounds.width},${this._bounds.height}`
  
  if (boundsKey !== this.lastBoundsKey || !this.frameContext) {
    this.frameContext = this.buildFrameContext(this._bounds, GROUP_PADDING)
    this.lastBoundsKey = boundsKey
    
    // Rebuild frame graphics with new context
    this.frameGraphics.destroy()
    this.frameGraphics = new Graphics(this.frameContext)
    this.frameGraphics.eventMode = 'static'
    this.frameGraphics.cursor = 'move'
    this.container.addChildAt(this.frameGraphics, 0)
  }
  
  this.updateHandlePositions()
}
```

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/transform-box/multi-transform-box.ts`

## Testing Checklist

- [ ] Multi-selection frame renders correctly
- [ ] Dashed line pattern is consistent
- [ ] Frame updates when selection changes
- [ ] Frame updates when elements move
- [ ] No visual regression in selection appearance
- [ ] Performance improvement measurable in profiler

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Multi-selection drag | Dashed line rebuild/frame | 0-1 rebuilds | ~80% reduction |
| Selection changes | Full rebuild | Cached rebuild | ~70% reduction |

## Notes

- Dashed line calculation involves trigonometry for each segment
- Caching the GraphicsContext avoids recalculating dash positions
- Handle positions still need updating (cheap operation)
