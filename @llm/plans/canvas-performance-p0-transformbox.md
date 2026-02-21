# Sub-Plan: TransformBox Graphics Caching

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P0-1:** TransformBox Graphics rebuild on every redraw  
**File:** `transform-box.ts:275-363`

---

## Problem Statement

Each `redraw()` clears and rebuilds 9 Graphics objects (4 edges + 4 corners + rotation handle). This happens every frame during selection changes, causing significant CPU overhead.

### Current Code
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

---

## Solution Overview

Cache `GraphicsContext` objects and only rebuild when dimensions change. Position updates should only modify container transforms.

---

## Implementation Steps

### Step 1: Add Caching Fields
Add private fields to track cached contexts and bounds key.

```typescript
export class TransformBox implements IRenderable {
  private lastBoundsKey: string = ''
  private edgeContexts: Map<string, GraphicsContext> = new Map()
  private cornerContext: GraphicsContext | null = null
  private rotationHandleContext: GraphicsContext | null = null
  
  private getBoundsKey(bounds: Bounds): string {
    return `${bounds.width.toFixed(2)}x${bounds.height.toFixed(2)}`
  }
}
```

### Step 2: Build Context Methods
Create methods to build reusable GraphicsContext objects.

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

private buildRotationHandleContext(): void {
  this.rotationHandleContext = new GraphicsContext()
    .circle(0, 0, ROTATION_HANDLE_RADIUS)
    .fill({ color: SELECTION_FILL })
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
}
```

### Step 3: Optimized redraw() Method
Only rebuild contexts when bounds change; always update positions.

```typescript
public redraw(): void {
  const bounds = this.target.localBounds
  const p = SELECTION_PADDING
  const boundsKey = this.getBoundsKey(bounds)
  
  // Only rebuild contexts if bounds changed
  if (boundsKey !== this.lastBoundsKey) {
    this.buildEdgeContexts(bounds.width, bounds.height, p)
    if (!this.cornerContext) this.buildCornerContext()
    if (!this.rotationHandleContext) this.buildRotationHandleContext()
    this.lastBoundsKey = boundsKey
    
    // Rebuild edge graphics with new contexts
    const hCtx = this.edgeContexts.get('horizontal')!
    const vCtx = this.edgeContexts.get('vertical')!
    
    // Rebuild edge graphics
    this.topEdge.destroy()
    this.topEdge = new Graphics(hCtx)
    this.topEdge.position.set(-p, -p)
    this.container.addChild(this.topEdge)
    
    this.bottomEdge.destroy()
    this.bottomEdge = new Graphics(hCtx)
    this.bottomEdge.position.set(-p, bounds.height + p)
    this.container.addChild(this.bottomEdge)
    
    this.leftEdge.destroy()
    this.leftEdge = new Graphics(vCtx)
    this.leftEdge.position.set(-p, -p)
    this.container.addChild(this.leftEdge)
    
    this.rightEdge.destroy()
    this.rightEdge = new Graphics(vCtx)
    this.rightEdge.position.set(bounds.width + p, -p)
    this.container.addChild(this.rightEdge)
    
    // Rebuild corner handles with shared context
    const cornerCtx = this.cornerContext!
    const corners = [
      { name: 'nw', x: -p, y: -p },
      { name: 'ne', x: bounds.width + p, y: -p },
      { name: 'se', x: bounds.width + p, y: bounds.height + p },
      { name: 'sw', x: -p, y: bounds.height + p },
    ]
    
    for (const corner of corners) {
      const handle = this[`${corner.name}Handle` as keyof TransformBox] as Graphics
      handle.destroy()
      const newHandle = new Graphics(cornerCtx)
      newHandle.position.set(corner.x, corner.y)
      newHandle.eventMode = 'static'
      this.container.addChild(newHandle)
      ;(this as any)[`${corner.name}Handle`] = newHandle
    }
    
    // Rebuild rotation handle
    this.rotationHandle.destroy()
    this.rotationHandle = new Graphics(this.rotationHandleContext!)
    this.rotationHandle.position.set(bounds.width / 2, -p - ROTATION_HANDLE_OFFSET)
    this.rotationHandle.eventMode = 'static'
    this.container.addChild(this.rotationHandle)
  } else {
    // Just update positions (cheap)
    this.updateHandlePositions(bounds)
  }
  
  this.updateCursors()
}
```

### Step 4: Position Update Method
Extract position updates into a separate method.

```typescript
private updateHandlePositions(bounds: Bounds): void {
  const p = SELECTION_PADDING
  const left = -p
  const top = -p
  const right = bounds.width + p
  const bottom = bounds.height + p
  const centerX = bounds.width / 2
  const centerY = bounds.height / 2
  
  // Update edge positions
  this.topEdge.position.set(-p, -p)
  this.bottomEdge.position.set(-p, bottom)
  this.leftEdge.position.set(-p, -p)
  this.rightEdge.position.set(right, -p)
  
  // Update corner positions
  this.nwHandle.position.set(left, top)
  this.neHandle.position.set(right, top)
  this.seHandle.position.set(right, bottom)
  this.swHandle.position.set(left, bottom)
  
  // Update rotation handle
  this.rotationHandle.position.set(centerX, top - ROTATION_HANDLE_OFFSET)
}
```

---

## Testing Checklist

- [ ] TransformBox renders correctly on initial selection
- [ ] TransformBox updates when element is resized
- [ ] TransformBox updates when element is rotated
- [ ] TransformBox updates when element is moved
- [ ] Handle interactions (drag, rotate) still work
- [ ] Multiple rapid selections don't cause visual glitches
- [ ] Memory usage doesn't grow unbounded

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Selection change | 9 Graphics rebuilds | 0-1 rebuilds | ~90% reduction |
| Resize operation | 9 Graphics/frame | Position updates only | ~95% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/transform-box/transform-box.ts`

## Estimated Effort

1-2 days (including testing)
