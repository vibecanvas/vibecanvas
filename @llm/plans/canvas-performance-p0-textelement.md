# Sub-Plan: TextElement Re-rasterization Prevention

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P0-2:** TextElement double re-rasterization during resize  
**File:** `text.class.ts:147-196`

---

## Problem Statement

`setResize()` calls `redraw()` twice (lines 174 and 194), and each `redraw()` re-rasterizes text by setting `text`, `fontSize`, and `fontFamily`. Text rasterization is expensive and causes severe FPS drops during resize operations.

### Current Code Issues
```typescript
public redraw(): void {
  const { data } = this.element
  
  // EVERY call triggers re-rasterization
  this.text.text = data.text
  this.text.style.fontSize = data.fontSize
  this.text.style.fontFamily = data.fontFamily
  // ...
}

public setResize(ctx: TResizeContext): void {
  // ... calculations ...
  
  this.redraw()  // First redraw - expensive!
  
  // ... more calculations ...
  
  this.redraw()  // Second redraw - expensive!
  this.transformBox?.redraw()
}
```

---

## Solution Overview

1. Cache text property values and only update PixiJS Text when actually changed
2. Optimize `setResize()` to call `redraw()` only once

---

## Implementation Steps

### Step 1: Add Caching Fields
Add private fields to track cached text properties.

```typescript
export class TextElement extends AElement<'text'> {
  private cachedText: string = ''
  private cachedFontSize: number = 0
  private cachedFontFamily: string = ''
  private cachedFill: string = ''
  private cachedAlpha: number = 1
  private cachedWidth: number = 0
  private cachedHeight: number = 0
}
```

### Step 2: Optimized redraw() Method
Only update text properties when they have actually changed.

```typescript
public redraw(): void {
  const { data } = this.element
  const textColor = this.element.style.strokeColor && this.element.style.strokeColor !== 'transparent'
    ? this.element.style.strokeColor
    : '#1f1f22'
  const textOpacity = this.element.style.opacity ?? 1
  
  // Only update if changed (prevents re-rasterization)
  if (this.cachedText !== data.text) {
    this.text.text = data.text
    this.cachedText = data.text
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
  
  // Update dimensions from measured text (only if changed)
  const w = this.text.width
  const h = this.text.height
  
  if (this.cachedWidth !== w || this.cachedHeight !== h) {
    this.cachedWidth = w
    this.cachedHeight = h
    this.element.data.w = w
    this.element.data.h = h
    
    // Update container pivot when dimensions change
    this.container.pivot.set(w / 2, h / 2)
  }
  
  this.container.position.set(this.element.x + w / 2, this.element.y + h / 2)
  
  // Only redraw transform box if visible
  if (this.transformBox?.container.visible) {
    this.transformBox.redraw()
  }
}
```

### Step 3: Optimized setResize() Method
Restructure to call `redraw()` only once at the end.

```typescript
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
  
  // Calculate new position
  const rotation = this.container.rotation
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const startAnchorLocal = getFixedAnchorOffset(ctx.handle, ctx.startBounds.w, ctx.startBounds.h)
  const startCenterX = ctx.startBounds.x + ctx.startBounds.w / 2
  const startCenterY = ctx.startBounds.y + ctx.startBounds.h / 2
  const fixedAnchorWorldX = startCenterX + startAnchorLocal.x * cos - startAnchorLocal.y * sin
  const fixedAnchorWorldY = startCenterY + startAnchorLocal.x * sin + startAnchorLocal.y * cos
  
  // Need to measure text first - single redraw to get dimensions
  this.redraw()
  
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
```

### Step 4: Consider Further Optimization
If still experiencing lag, consider deferring the intermediate redraw:

```typescript
public setResize(ctx: TResizeContext): void {
  // ... calculations ...
  
  // Option: Use approximate dimensions instead of measuring
  const approximateWidth = ctx.startBounds.w * scale
  const approximateHeight = ctx.startBounds.h * scale
  
  // Calculate position using approximations
  // ... position calculations using approximations ...
  
  // Single redraw at the end
  this.redraw()
  this.transformBox?.redraw()
}
```

---

## Testing Checklist

- [ ] Text renders correctly on initial creation
- [ ] Text updates when content changes
- [ ] Text updates when font size changes
- [ ] Text updates when font family changes
- [ ] Text updates when color changes
- [ ] Text resize maintains anchor point correctly
- [ ] Rapid text resize doesn't cause visual glitches
- [ ] Long text strings don't cause performance issues

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Text resize | 2-3 FPS | 30-40 FPS | 1000%+ |
| Text content update | 1 re-rasterization | 0-1 re-rasterization | ~50% reduction |
| Font size change | 1 re-rasterization | 0-1 re-rasterization | ~50% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/elements/text/text.class.ts`

## Estimated Effort

1-2 days (including testing)
