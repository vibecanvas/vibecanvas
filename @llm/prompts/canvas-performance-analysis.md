# Canvas Performance Analysis Prompt

## Task

Analyze the PixiJS canvas rendering system for performance bottlenecks. Focus on identifying unnecessary redraws, inefficient PixiJS usage patterns, and missing optimizations.

## Key Files to Analyze

### Core Canvas Files
- `apps/spa/src/features/canvas-crdt/canvas/canvas.ts` - Main Canvas class, PixiJS Application setup
- `apps/spa/src/features/canvas-crdt/canvas/setup.doc-sync.ts` - CRDT sync and store effects
- `apps/spa/src/features/canvas-crdt/canvas/element.patch.ts` - Element update handling from CRDT patches

### Renderable Elements
- `apps/spa/src/features/canvas-crdt/renderables/element.abstract.ts` - Base AElement class
- `apps/spa/src/features/canvas-crdt/renderables/elements/rect/rect.class.ts` - RectElement implementation
- `apps/spa/src/features/canvas-crdt/renderables/elements/text/text.class.ts` - TextElement (note: Text re-rasterization)

### Transform/Selection UI
- `apps/spa/src/features/canvas-crdt/renderables/transform-box/transform-box.ts` - Single element transform box
- `apps/spa/src/features/canvas-crdt/renderables/transform-box/multi-transform-box.ts` - Multi-selection transform box
- `apps/spa/src/features/canvas-crdt/renderables/virtual-group.class.ts` - VirtualGroup with caching

### Input Commands
- `apps/spa/src/features/canvas-crdt/input-commands/cmd.drag-selection.ts` - Drag command with throttling

## PixiJS Performance Rules (from docs/pixi/)

### Critical Rules
1. **NEVER clear and rebuild Graphics every frame** - Use `GraphicsContext` swapping instead
2. **Text re-rasterization is expensive** - Changing `text.text` or `text.style` triggers re-rasterization
3. **GraphicsContext can be shared** - Reuse contexts for repeated shapes
4. **Use `visible = false` not `removeChild`** - For temporary hiding

### From llm.pixi.graphics.md
```
Performance Best Practices:
- Do not clear and rebuild graphics every frame. If your content is dynamic, 
  prefer swapping prebuilt GraphicsContext objects instead of recreating them.
- Use Graphics.destroy() to clean up when done. Shared contexts are not auto-destroyed.
- Use many simple Graphics objects over one complex one to maintain GPU batching.
```

### From llm.pixi.canvas.md (Text)
```
:::warning
Changing text or style re-rasterizes the object. Avoid doing this every frame unless necessary.
:::
```

## Known Problem Patterns

### 1. redraw() Called Excessively
Look for these patterns:
```typescript
// PROBLEMATIC: redraw() called in setters
set dimensions(dim: TDimensions) {
  this.element.data.w = dim.w
  this.element.data.h = dim.h
  this.redraw()  // Called on every dimension change
}

// PROBLEMATIC: redraw() during drag operations
public setResize(ctx: TResizeContext): void {
  // ... calculations ...
  this.redraw()           // First redraw
  this.transformBox?.redraw()  // Second redraw
}
```

### 2. Text Element Re-rasterization
In `text.class.ts`:
```typescript
public redraw(): void {
  // EVERY call re-rasterizes:
  this.text.text = data.text           // Triggers re-rasterization
  this.text.style.fontSize = data.fontSize  // Triggers re-rasterization
  this.text.style.fontFamily = data.fontFamily  // Triggers re-rasterization
  // ...
}
```

### 3. TransformBox Redraw Issues
In `transform-box.ts`:
```typescript
// Lines 275-363: redraw() clears and rebuilds ALL graphics
public redraw(): void {
  this.container.visible = false  // Hide to prevent flicker
  
  // Clears and rebuilds 4 edges + 4 corners + rotation handle
  this.topEdge.clear().moveTo(0, 0).lineTo(width, 0).stroke(...)
  // ... repeated for all handles
  
  this.container.visible = true
}
```

### 4. CRDT Patch Handling
In `element.patch.ts`:
```typescript
function handleElementUpdated(canvas, doc, elementId) {
  // ALWAYS calls redraw() even for minor updates
  renderable.redraw()  // Line 154
}
```

### 5. SolidJS Store Effects
In `setup.doc-sync.ts`:
```typescript
// Lines 150-234: createEffect runs on EVERY selection change
createEffect(() => {
  const selectedIds = store.canvasSlice.selectedIds
  // Iterates all elements, calls transformBox.setMode(), transformBox.redraw()
})
```

## Specific Performance Checks

### Check 1: Redraw Frequency During Drag
**Location**: `cmd.drag-selection.ts` lines 202-236

```typescript
function handleMove(ctx: PointerInputContext): boolean {
  // Called every pointermove event (60+ times/sec during drag)
  for (const target of state.targets) {
    target.dispatch({ type: 'move', delta: new Point(deltaX, deltaY) })
  }
  
  // Lines 224-228: VirtualGroup redraw during move
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      ;(target as VirtualGroup).redraw()  // Called every frame!
    }
  }
  
  // Lines 231-234: MultiTransformBox redraw
  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()  // Called every frame!
  }
}
```

**Question**: Should these redraws happen every frame, or can transforms be applied via container.position changes?

### Check 2: Text Element During Resize
**Location**: `text.class.ts` lines 147-196

During resize, `setResize()` calls `redraw()` TWICE (lines 174 and 194), each re-rasterizing the text.

### Check 3: Selection Effect Efficiency
**Location**: `setup.doc-sync.ts` lines 150-234

The selection effect:
1. Deselects ALL elements (lines 154-161)
2. Then re-selects based on new state
3. Calls `transformBox.setMode()` and `transformBox.redraw()` for each

**Question**: Can we diff the selection instead of full reset?

### Check 4: GraphicsContext Reuse
**Location**: `transform-box.ts` lines 109-155

```typescript
private drawFrameEdges() {
  // Creates NEW GraphicsContext for each edge on EVERY redraw()
  const horizontalCtx = new GraphicsContext()
    .moveTo(0, 0)
    .lineTo(width, 0)
    .stroke({ color: SELECTION_COLOR, pixelLine: true })
  
  this.topEdge = new Graphics(horizontalCtx)
  // ...
}
```

**Question**: Could these contexts be cached and reused?

### Check 5: VirtualGroup Bounds Caching
**Location**: `virtual-group.class.ts` lines 163-171, 174-176

```typescript
private computeBounds(): Bounds {
  if (this._bounds) return this._bounds  // Cache hit
  // ... expensive computation ...
  this._bounds = computeBoundingBox(this.members.map(m => m.worldBounds))
  return this._bounds
}

public get worldBounds(): Bounds {
  return this.computeBounds()  // Called frequently
}
```

**Question**: Is invalidation happening too frequently (line 279 in dispatch)?

### Check 6: MultiTransformBox Frame Drawing
**Location**: `multi-transform-box.ts` lines 74-107

```typescript
private drawDashedFrame(): void {
  this.frameGraphics.clear()  // Clears all
  
  // Draws 4 edges as individual dashed lines
  // Each dash is a separate stroke command
  for (const seg of segments) {
    this.frameGraphics
      .moveTo(seg.startX, seg.startY)
      .lineTo(seg.endX, seg.endY)
      .stroke({ color: SELECTION_COLOR, width: 1 })
  }
}
```

**Question**: Can this be optimized with a single path or cached geometry?

## Analysis Output Format

For each file analyzed, provide:

1. **File**: Path to the file
2. **Issues Found**: List of specific performance issues
3. **Code References**: Line numbers and code snippets
4. **Impact**: High/Medium/Low
5. **Recommended Fix**: Specific code changes

## Example Output Structure

```markdown
### File: apps/spa/src/features/canvas-crdt/renderables/transform-box/transform-box.ts

**Issue 1: Graphics rebuild on every redraw()**
- **Location**: Lines 275-363
- **Impact**: High during selection/resize
- **Problem**: Each redraw() clears and rebuilds 9 Graphics objects (4 edges + 4 corners + rotation handle)
- **Fix**: Cache GraphicsContext objects, only rebuild when dimensions change

**Issue 2: Visibility toggle causing render interruption**
- **Location**: Lines 277, 362
- **Impact**: Low
- **Problem**: Setting visible=false/true around redraw may cause unnecessary render passes
- **Fix**: Use renderable=false or batch updates
```

## Questions to Answer

1. **Are redraws batched?** - Look for any batching mechanism or are they immediate?
2. **Is there over-draw?** - Are elements being redrawn that haven't changed?
3. **Are transforms used efficiently?** - Is position change done via container.x/y or redraw()?
4. **Text re-rasterization** - How often does text get re-rasterized?
5. **Store effect efficiency** - Do Solid effects cause cascading redraws?
6. **Graphics sharing** - Could GraphicsContext be shared between similar elements?

## Deliverable

Provide a comprehensive report with:
1. List of all performance issues found
2. Prioritized by impact (High/Medium/Low)
3. Specific code locations with line numbers
4. Recommended fixes with code examples
5. Estimated performance gain for each fix
