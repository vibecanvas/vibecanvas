# Canvas Performance Optimization Plan

## Sub-Plans

| # | Issue | Priority | Link |
|---|-------|----------|------|
| 01 | TransformBox Graphics Caching | P0 | [Sub-Plan](./canvas-performance/subplan-01-transformbox-cache.md) |
| 02 | TextElement Re-rasterization Fix | P0 | [Sub-Plan](./canvas-performance/subplan-02-textelement-cache.md) |
| 03 | Drag Selection Container Transforms | P0 | [Sub-Plan](./canvas-performance/subplan-03-drag-selection-transforms.md) |
| 04 | MultiTransformBox Dashed Line Caching | P1 | [Sub-Plan](./canvas-performance/subplan-04-multitransformbox-cache.md) |
| 05 | Conditional Redraw on CRDT Patches | P1 | [Sub-Plan](./canvas-performance/subplan-05-conditional-patch-redraw.md) |
| 06 | Selection Effect Diffing | P1 | [Sub-Plan](./canvas-performance/subplan-06-selection-diffing.md) |
| 07 | VirtualGroup Smart Cache Invalidation | P2 | [Sub-Plan](./canvas-performance/subplan-07-virtualgroup-cache.md) |
| 08 | RectElement Dimensions Setter Check | P2 | [Sub-Plan](./canvas-performance/subplan-08-rect-dimensions-check.md) |

## Overview

This plan addresses 8 critical performance issues in the PixiJS canvas rendering system. The primary bottlenecks are excessive `redraw()` calls, unnecessary Graphics rebuilds, and inefficient text re-rasterization.

## Implementation Updates

### 2026-02-24 - Move Path Optimization (Unplanned, High ROI)

- Implemented no-redraw move path for WH/radius element families by updating container translation directly in `rect.apply-move.ts`.
- Implemented the same no-redraw move path for line/arrow family in `line.apply-move.ts`.
- Added unit tests for both move paths to verify:
  - element coordinates and container transforms stay in sync,
  - CRDT changes are unchanged,
  - redraw is not invoked during move.

### What We Learned

- For bounded movement, container translation must use **applied delta after clamp**, not raw pointer delta, otherwise container/data drift can occur at world bounds.
- Move actions change only translation, not geometry, so avoiding redraw on move is safe and yields immediate drag FPS gains across many element types.

### 2026-02-24 - Drag Selection Fast Path (P0-3 foundation)

- Implemented a drag fast path in `cmd.drag-selection.ts`:
  - captures per-target pre-move snapshots,
  - computes per-target applied deltas after dispatch,
  - translates `VirtualGroup` containers directly when motion is pure translation,
  - translates `MultiTransformBox` directly when all targets share a uniform applied delta.
- Added guarded fallback to full recompute/redraw when needed:
  - non-uniform applied deltas across targets,
  - `VirtualGroup` bounds size changes (non-translation behavior near clamp edges).
- Added lightweight transient translation API to `MultiTransformBox` via `translateBy(dx, dy)` and reset that transient offset in `redraw()`.

### What We Learned (Drag)

- We can remove most per-frame `computeGroupBounds()+redraw()` work by treating drag as translation first and only escalating to full refresh when observed deltas/bounds indicate non-translational behavior.
- Resetting transient multi-box translation inside authoritative `redraw()` keeps visuals stable while preventing offset accumulation across gestures.

### 2026-02-24 - Idle Loop Reductions (Overlay + Devtools)

- Gated Pixi devtools initialization to development mode only in `canvas.ts`.
- Removed per-frame ticker polling from chat/filetree overlay synchronization.
- Added event-driven viewport notifications:
  - `Canvas` now exposes `onViewportChange()` and `notifyViewportChanged()`.
  - pan/zoom commands call `notifyViewportChanged()` when stage transform changes.
- Updated chat/filetree overlays to refresh bounds only on:
  - element transform/redraw,
  - viewport-change notifications.
- Added bounds-diff guards for chat/filetree overlay updates to skip redundant Solid signal writes.

### What We Learned (Idle)

- The main idle heat contributor in this area was not canvas mutation itself, but continuous UI overlay synchronization work running on every frame.
- Event-driven synchronization plus bounds diffing preserves behavior while cutting idle reactive churn significantly.

### 2026-02-24 - Drag Smoothness Follow-up

- Reintroduced per-drag-event overlay bounds updates for chat/filetree widgets only (no idle ticker restore).
- Implementation: force `updateOverlayBounds(true)` inside `onDrag` handlers so overlays track pointer movement every drag frame.

### What We Learned (Drag vs Idle)

- Global per-frame ticker loops should stay removed for idle thermals.
- Drag interactions still require per-event overlay updates for smooth visual coupling; this can be scoped to active drag handlers without reintroducing idle heat.

## Issues Summary

| Priority | Issue | File | Impact | Sub-Plan |
|----------|-------|------|--------|----------|
| P0 | TransformBox Graphics rebuild on every redraw | `transform-box.ts:275-363` | High | [Sub-Plan 01](./subplan-01-transformbox-cache.md) |
| P0 | TextElement double re-rasterization during resize | `text.class.ts:147-196` | High | [Sub-Plan 02](./subplan-02-textelement-cache.md) |
| P0 | Excessive redraws during drag operations | `cmd.drag-selection.ts:224-234` | High | [Sub-Plan 03](./subplan-03-drag-selection-transforms.md) |
| P1 | MultiTransformBox dashed line rebuild | `multi-transform-box.ts:74-107` | Medium-High | [Sub-Plan 04](./subplan-04-multitransformbox-cache.md) |
| P1 | Unconditional redraw on CRDT patches | `element.patch.ts:154` | Medium | [Sub-Plan 05](./subplan-05-conditional-patch-redraw.md) |
| P1 | Selection effect full reset | `setup.doc-sync.ts:150-234` | Medium | [Sub-Plan 06](./subplan-06-selection-diffing.md) |
| P2 | VirtualGroup bounds cache invalidation | `virtual-group.class.ts:279` | Medium | [Sub-Plan 07](./subplan-07-virtualgroup-cache.md) |
| P2 | Dimensions setter always redraws | `rect.class.ts:139-147` | Low-Medium | [Sub-Plan 08](./subplan-08-rect-dimensions-check.md) |

---

## P0: Critical Issues (Implement First)

### 1. TransformBox.redraw() - Cache GraphicsContext

**[View Full Sub-Plan](./canvas-performance/subplan-01-transformbox-cache.md)**

**Current Problem:**
Each `redraw()` clears and rebuilds 9 Graphics objects (4 edges + 4 corners + rotation handle).

**Current Code (transform-box.ts:275-363):**
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

**Solution:**
Cache GraphicsContext objects and only rebuild when dimensions change.

**Implementation:**
```typescript
export class TransformBox implements IRenderable {
  // Add caching fields
  private lastBoundsKey: string = ''
  private edgeContexts: Map<string, GraphicsContext> = new Map()
  private cornerContext: GraphicsContext | null = null
  
  private getBoundsKey(bounds: Bounds): string {
    return `${bounds.width.toFixed(2)}x${bounds.height.toFixed(2)}`
  }
  
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
}
```

---

### 2. TextElement.redraw() - Avoid Re-rasterization

**[View Full Sub-Plan](./canvas-performance/subplan-02-textelement-cache.md)**

**Current Problem:**
`setResize()` calls `redraw()` twice (lines 174 and 194), and each `redraw()` re-rasterizes text by setting `text`, `fontSize`, and `fontFamily`.

**Current Code (text.class.ts:198-229):**
```typescript
public redraw(): void {
  const { data } = this.element
  
  // EVERY call triggers re-rasterization
  this.text.text = data.text
  this.text.style.fontSize = data.fontSize
  this.text.style.fontFamily = data.fontFamily
  this.text.style.fill = textColor
  this.text.alpha = textOpacity
  // ...
}
```

**Solution:**
Cache values and only update PixiJS Text when actually changed.

**Implementation:**
```typescript
export class TextElement extends AElement<'text'> {
  // Add caching fields
  private cachedText: string = ''
  private cachedFontSize: number = 0
  private cachedFontFamily: string = ''
  private cachedFill: string = ''
  private cachedAlpha: number = 1
  
  public redraw(): void {
    const { data } = this.element
    const textColor = this.element.style.strokeColor && this.element.style.strokeColor !== 'transparent'
      ? this.element.style.strokeColor
      : '#1f1f22'
    const textOpacity = this.element.style.opacity ?? 1
    
    // Only update if changed (prevents re-rasterization)
    if (this.text.text !== data.text) {
      this.text.text = data.text
    }
    
    if (this.cachedFontSize !== data.fontSize) {
      this.text.style.fontSize = data.fontSize
      this.cachedFontSize = data.fontSize
    }
    
    if (this.cachedFontFamily !== data.fontFamily) {
      this.text.style.fontFamily = data.fontFamily
      this.cachedFontFamily = data.fontFamily
    }
    
    if (this.cachedFill !== textColor) {
      this.text.style.fill = textColor
      this.cachedFill = textColor
    }
    
    if (this.cachedAlpha !== textOpacity) {
      this.text.alpha = textOpacity
      this.cachedAlpha = textOpacity
    }
    
    // Position updates (always needed)
    this.text.x = 0
    this.text.y = 0
    
    // Update dimensions from measured text
    const w = this.text.width
    const h = this.text.height
    this.element.data.w = w
    this.element.data.h = h
    
    // Update container
    this.container.pivot.set(w / 2, h / 2)
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2)
    
    // Only redraw transform box if visible
    if (this.transformBox?.container.visible) {
      this.transformBox.redraw()
    }
  }
  
  // Also fix setResize to only call redraw once
  public setResize(ctx: TResizeContext): void {
    const bounds = calculateRotatedResize(ctx, this.container.rotation)
    const gestureKey = `${ctx.startWorldX}:${ctx.startWorldY}:${ctx.startBounds.w}:${ctx.startBounds.h}`
    
    if (this.resizeStartKey !== gestureKey) {
      this.resizeStartKey = gestureKey
      this.resizeStartFontSize = this.element.data.fontSize
    }
    
    // Calculate scale and new font size
    const widthScale = bounds.w / Math.max(1, ctx.startBounds.w)
    const heightScale = bounds.h / Math.max(1, ctx.startBounds.h)
    let scale = 1
    if (ctx.handle === 'e' || ctx.handle === 'w') {
      scale = widthScale
    } else if (ctx.handle === 'n' || ctx.handle === 's') {
      scale = heightScale
    } else {
      scale = Math.max(widthScale, heightScale)
    }
    
    const nextFontSize = Math.max(8, Math.min(512, Math.round(this.resizeStartFontSize * scale)))
    this.element.data.fontSize = nextFontSize
    
    // First pass
    this.element.x = clampX(bounds.x)
    this.element.y = clampY(bounds.y)
    
    // Calculate anchor adjustment without calling redraw()
    const rotation = this.container.rotation
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const startAnchorLocal = getFixedAnchorOffset(ctx.handle, ctx.startBounds.w, ctx.startBounds.h)
    const startCenterX = ctx.startBounds.x + ctx.startBounds.w / 2
    const startCenterY = ctx.startBounds.y + ctx.startBounds.h / 2
    const fixedAnchorWorldX = startCenterX + startAnchorLocal.x * cos - startAnchorLocal.y * sin
    const fixedAnchorWorldY = startCenterY + startAnchorLocal.x * sin + startAnchorLocal.y * cos
    
    // Need to measure text first
    this.redraw() // First redraw to get new dimensions
    
    const currentW = this.element.data.w
    const currentH = this.element.data.h
    const currentAnchorLocal = getFixedAnchorOffset(ctx.handle, currentW, currentH)
    const centerX = fixedAnchorWorldX - (currentAnchorLocal.x * cos - currentAnchorLocal.y * sin)
    const centerY = fixedAnchorWorldY - (currentAnchorLocal.x * sin + currentAnchorLocal.y * cos)
    
    this.element.x = clampX(centerX - currentW / 2)
    this.element.y = clampY(centerY - currentH / 2)
    
    // Single final redraw
    this.redraw()
    this.transformBox?.redraw()
  }
}
```

---

### 3. CmdDragSelection - Use Container Transforms

**[View Full Sub-Plan](./canvas-performance/subplan-03-drag-selection-transforms.md)**

**Current Problem:**
During `pointermove`, VirtualGroup and MultiTransformBox are redrawn EVERY frame.

**Current Code (cmd.drag-selection.ts:224-234):**
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

**Solution:**
Use container position transforms during drag, only redraw on `pointerup`.

**Implementation:**
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

---

## P1: Important Issues

### 4. MultiTransformBox - Cache Dashed Line Geometry

**[View Full Sub-Plan](./canvas-performance/subplan-04-multitransformbox-cache.md)**

**File:** `multi-transform-box.ts:74-107`

**Solution:**
```typescript
export class MultiTransformBox implements IRenderable {
  private lastBoundsKey: string = ''
  private frameContext: GraphicsContext | null = null
  
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
}
```

---

### 5. Element.patch.ts - Conditional Redraw

**[View Full Sub-Plan](./canvas-performance/subplan-05-conditional-patch-redraw.md)**

**File:** `element.patch.ts:117-155`

**Solution:**
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

---

### 6. Setup.doc-sync.ts - Diff Selection Changes

**[View Full Sub-Plan](./canvas-performance/subplan-06-selection-diffing.md)**

**File:** `setup.doc-sync.ts:150-234`

**Solution:**
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
      for (const id of removed) {
        // Deselect removed items
        const group = canvas.groupManager.groups.get(id)
        if (group) {
          group.deselect()
        } else {
          const element = canvas.elements.get(id)
          if (element) {
            element.isSelected = false
          }
        }
      }
      
      // Handle new selection
      if (selectedIds.length === 1) {
        const id = selectedIds[0]
        const virtualGroup = canvas.groupManager.groups.get(id)
        
        if (virtualGroup) {
          virtualGroup.transformBox?.setMode('full')
          virtualGroup.select()
          
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
      } else if (selectedIds.length > 1) {
        // Multi-selection logic (similar optimization)
        // ...
      } else {
        canvas.multiTransformBox.hide()
      }
      
      previousSelectedIds = currentIds
    })
    
    return dispose
  })
  
  return dispose
}
```

---

## P2: Nice-to-Have Optimizations

### 7. VirtualGroup - Smart Cache Invalidation

**[View Full Sub-Plan](./canvas-performance/subplan-07-virtualgroup-cache.md)**

**File:** `virtual-group.class.ts:279`

Only invalidate bounds cache on position-changing actions, not all actions:

```typescript
public dispatch(action: TAction): TChanges | null {
  // ... existing code ...
  
  // Only invalidate bounds for actions that change positions
  const positionChangingActions = new Set(['move', 'scale', 'resize', 'rotate'])
  if (positionChangingActions.has(action.type)) {
    this._bounds = null
  }
  
  return {
    action,
    targetId: this.id,
    timestamp: Date.now(),
    changes: allChanges,
  }
}
```

---

### 8. RectElement.dimensions - Check Before Redraw

**[View Full Sub-Plan](./canvas-performance/subplan-08-rect-dimensions-check.md)**

**File:** `rect.class.ts:139-147`

```typescript
public set dimensions(dim: TDimensions) {
  const w = clampSize(dim.w)
  const h = clampSize(dim.h)
  
  // Only update if changed
  if (this.container.width === w && this.container.height === h &&
      this.element.data.w === w && this.element.data.h === h) {
    return
  }
  
  this.container.width = w
  this.container.height = h
  this.element.data.w = w
  this.element.data.h = h
  this.redraw()
}
```

---

## Testing Strategy

1. **Performance Benchmarks:**
   - Measure FPS during drag operations with 50+ elements
   - Profile text resize operations
   - Benchmark selection changes with many elements

2. **Visual Regression:**
   - Ensure TransformBox still renders correctly after caching
   - Verify text elements update properly when content changes
   - Test multi-selection drag behavior

3. **Edge Cases:**
   - Rapid selection/deselection
   - Dragging elements while receiving CRDT updates
   - Resizing text to very small/large sizes

---

## Implementation Order

1. **Week 1:** P0 issues (TransformBox, TextElement, DragSelection)
2. **Week 2:** P1 issues (MultiTransformBox, Element.patch, Setup.doc-sync)
3. **Week 3:** P2 issues + comprehensive testing

---

## Expected Performance Gains

| Metric | Current | Expected | Improvement |
|--------|---------|----------|-------------|
| Drag 50 elements | 15-20 FPS | 50-60 FPS | 150-200% |
| Text resize | 2-3 FPS | 30-40 FPS | 1000%+ |
| Selection change | 100ms | 20ms | 80% reduction |
| CRDT patch apply | 50ms | 15ms | 70% reduction |

---

## Files to Modify

1. `apps/spa/src/features/canvas-crdt/renderables/transform-box/transform-box.ts`
2. `apps/spa/src/features/canvas-crdt/renderables/elements/text/text.class.ts`
3. `apps/spa/src/features/canvas-crdt/input-commands/cmd.drag-selection.ts`
4. `apps/spa/src/features/canvas-crdt/renderables/transform-box/multi-transform-box.ts`
5. `apps/spa/src/features/canvas-crdt/canvas/element.patch.ts`
6. `apps/spa/src/features/canvas-crdt/canvas/setup.doc-sync.ts`
7. `apps/spa/src/features/canvas-crdt/renderables/virtual-group.class.ts`
8. `apps/spa/src/features/canvas-crdt/renderables/elements/rect/rect.class.ts`
