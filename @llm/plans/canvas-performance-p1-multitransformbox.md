# Sub-Plan: MultiTransformBox Dashed Line Caching

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P1-4:** MultiTransformBox dashed line rebuild  
**File:** `multi-transform-box.ts:74-107`

---

## Problem Statement

MultiTransformBox rebuilds dashed line geometry on every redraw, recalculating all dash segments each time. This is expensive especially during multi-selection drag operations.

### Current Code Pattern
```typescript
public redraw(): void {
  this.frameGraphics.clear()
  
  // Rebuild dashed lines every time
  const b = this._bounds
  const p = GROUP_PADDING
  
  // Top edge dashes
  this.drawDashedLine(b.x - p, b.y - p, b.x + b.width + p, b.y - p)
  // ... repeat for all edges
}

private drawDashedLine(x1, y1, x2, y2): void {
  // Calculate dash segments every call
  const segments = calculateDashes(x1, y1, x2, y2)
  for (const seg of segments) {
    this.frameGraphics.moveTo(seg.x1, seg.y1)
    this.frameGraphics.lineTo(seg.x2, seg.y2)
  }
}
```

---

## Solution Overview

Cache `GraphicsContext` for the dashed frame and only rebuild when bounds change. Use a helper to calculate dash segments once.

---

## Implementation Steps

### Step 1: Add Caching Fields
```typescript
export class MultiTransformBox implements IRenderable {
  private lastBoundsKey: string = ''
  private frameContext: GraphicsContext | null = null
  
  private getBoundsKey(): string {
    return `${this._bounds.x.toFixed(2)},${this._bounds.y.toFixed(2)},${this._bounds.width.toFixed(2)},${this._bounds.height.toFixed(2)}`
  }
}
```

### Step 2: Dash Line Calculation Helper
Create a utility function for calculating dashed line segments.

```typescript
interface DashSegment {
  startX: number
  startY: number
  endX: number
  endY: number
}

function calculateDashedLineSegments(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLength: number,
  gapLength: number
): DashSegment[] {
  const segments: DashSegment[] = []
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance === 0) return segments
  
  const unitX = dx / distance
  const unitY = dy / distance
  
  let currentDist = 0
  let isDash = true
  
  while (currentDist < distance) {
    const segmentLength = isDash ? dashLength : gapLength
    const startDist = currentDist
    const endDist = Math.min(currentDist + segmentLength, distance)
    
    if (isDash) {
      segments.push({
        startX: x1 + unitX * startDist,
        startY: y1 + unitY * startDist,
        endX: x1 + unitX * endDist,
        endY: y1 + unitY * endDist,
      })
    }
    
    currentDist = endDist
    isDash = !isDash
  }
  
  return segments
}
```

### Step 3: Build Frame Context Method
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

### Step 4: Optimized redraw() Method
```typescript
public redraw(): void {
  const boundsKey = this.getBoundsKey()
  
  // Only rebuild context if bounds changed
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
  
  // Always update handle positions (cheap)
  this.updateHandlePositions()
}

private updateHandlePositions(): void {
  const b = this._bounds
  const p = GROUP_PADDING
  const left = b.x - p
  const top = b.y - p
  const right = b.x + b.width + p
  const bottom = b.y + b.height + p
  const centerX = b.x + b.width / 2
  const centerY = b.y + b.height / 2
  
  // Update handle positions
  this.nwHandle.position.set(left, top)
  this.neHandle.position.set(right, top)
  this.seHandle.position.set(right, bottom)
  this.swHandle.position.set(left, bottom)
  this.nHandle.position.set(centerX, top)
  this.sHandle.position.set(centerX, bottom)
  this.eHandle.position.set(right, centerY)
  this.wHandle.position.set(left, centerY)
}
```

### Step 5: Handle Position Updates
Ensure handle positions are updated efficiently.

```typescript
// In the class, ensure handles are created once and reused
private createHandles(): void {
  const handleSize = 8
  const halfSize = handleSize / 2
  
  const handleContext = new GraphicsContext()
    .rect(-halfSize, -halfSize, handleSize, handleSize)
    .fill({ color: SELECTION_FILL })
    .stroke({ color: SELECTION_COLOR, width: 1 })
  
  const positions = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as const
  
  for (const pos of positions) {
    const handle = new Graphics(handleContext)
    handle.eventMode = 'static'
    handle.cursor = this.getCursorForHandle(pos)
    this.container.addChild(handle)
    ;(this as any)[`${pos}Handle`] = handle
  }
}
```

---

## Testing Checklist

- [ ] MultiTransformBox renders correctly on multi-selection
- [ ] Dashed lines appear correctly around selection
- [ ] Box updates when selection bounds change
- [ ] Box updates when elements are moved
- [ ] Box updates when elements are resized
- [ ] Handle interactions work correctly
- [ ] Rapid selection changes don't cause visual glitches

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Multi-selection drag | Rebuild every frame | 0-1 rebuilds | ~95% reduction |
| Bounds change | Full rebuild | Context reuse | ~80% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/transform-box/multi-transform-box.ts`

## Estimated Effort

1-2 days (including testing)
