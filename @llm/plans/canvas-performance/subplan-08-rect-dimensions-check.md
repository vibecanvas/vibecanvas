# Sub-Plan: RectElement Dimensions Setter Check

## Overview

Add early return in RectElement.dimensions setter when values haven't changed to avoid unnecessary redraws.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P2 (Nice-to-have)
- **File:** `rect.class.ts:139-147`
- **Impact:** Low-Medium - Prevents redundant redraws

## Current Problem

The dimensions setter always updates values and triggers redraw, even when nothing changed:

```typescript
public set dimensions(dim: TDimensions) {
  const w = clampSize(dim.w)
  const h = clampSize(dim.h)
  
  // ALWAYS updates and redraws
  this.container.width = w
  this.container.height = h
  this.element.data.w = w
  this.element.data.h = h
  this.redraw()
}
```

## Implementation

### 1. Add Change Check

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

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/elements/rect/rect.class.ts`

## Testing Checklist

- [ ] Dimensions update when values change
- [ ] Early return when values are identical
- [ ] Early return when values are equivalent (after clamping)
- [ ] Rect resize works correctly
- [ ] No visual regression in RectElement behavior

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Redundant dimension sets | Always redraws | Early return | 100% reduction |
| Frequent dimension updates | N redraws | N-M redraws | Variable |

## Notes

- This is a defensive optimization that prevents redundant work
- The check is cheap (4 comparisons)
- Should be applied to other element types with similar setters
- Consider extracting to a shared utility for dimension checking
