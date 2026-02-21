# Sub-Plan: VirtualGroup Smart Cache Invalidation

## Overview

Only invalidate VirtualGroup bounds cache on position-changing actions, not all actions. This prevents unnecessary bounds recalculation.

## Parent Plan

[Canvas Performance Optimization Plan](../canvas-performance-plan.md)

## Issue Reference

- **Priority:** P2 (Nice-to-have)
- **File:** `virtual-group.class.ts:279`
- **Impact:** Medium - Unnecessary bounds recalculation

## Current Problem

The bounds cache is invalidated on every dispatch, even for actions that don't change positions:

```typescript
public dispatch(action: TAction): TChanges | null {
  // ... existing code ...
  
  // ALWAYS invalidates cache
  this._bounds = null  // Line 279
  
  return {
    action,
    targetId: this.id,
    timestamp: Date.now(),
    changes: allChanges,
  }
}
```

## Implementation

### 1. Smart Cache Invalidation

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

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/virtual-group.class.ts`

## Testing Checklist

- [ ] Bounds recalculate on move action
- [ ] Bounds recalculate on scale action
- [ ] Bounds recalculate on resize action
- [ ] Bounds recalculate on rotate action
- [ ] Bounds cached for non-position actions
- [ ] VirtualGroup drag works correctly
- [ ] VirtualGroup resize works correctly
- [ ] No visual regression in VirtualGroup behavior

## Expected Performance Gain

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Non-position actions | Cache cleared | Cache preserved | ~50% reduction |
| Bounds access frequency | Always recalc | Often cached | Variable |

## Notes

- Bounds calculation requires iterating all member elements
- Non-position actions might include: select, deselect, style changes, etc.
- The cache is lazy-populated on first bounds access after invalidation
- This is a lower-priority optimization but easy to implement
