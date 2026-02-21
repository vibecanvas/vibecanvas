# Sub-Plan: VirtualGroup Bounds Cache Invalidation

## Parent Plan
[Canvas Performance Optimization Plan](./canvas-performance-plan.md)

## Issue Reference
**P2-7:** VirtualGroup bounds cache invalidation  
**File:** `virtual-group.class.ts:279`

---

## Problem Statement

VirtualGroup invalidates its bounds cache on every action dispatch, even for actions that don't change member positions (like style changes or selection changes).

### Current Code
```typescript
public dispatch(action: TAction): TChanges | null {
  // ... action handling ...
  
  // ALWAYS invalidates cache, even for non-position actions
  this._bounds = null
  
  return {
    action,
    targetId: this.id,
    timestamp: Date.now(),
    changes: allChanges,
  }
}
```

---

## Solution Overview

Only invalidate bounds cache for actions that actually change member positions.

---

## Implementation Steps

### Step 1: Define Position-Changing Actions
Create a set of actions that affect bounds.

```typescript
// Actions that change element positions and require bounds recalculation
const POSITION_CHANGING_ACTIONS = new Set([
  'move',
  'scale',
  'resize',
  'rotate',
  'setPosition',
  'setDimensions',
  'setRotation',
])

// Actions that might affect bounds indirectly
const INDIRECTLY_AFFECTING_ACTIONS = new Set([
  'addMember',
  'removeMember',
])
```

### Step 2: Smart Cache Invalidation
Update dispatch to only invalidate when necessary.

```typescript
public dispatch(action: TAction): TChanges | null {
  const allChanges: TChange[] = []
  
  // Handle different action types
  switch (action.type) {
    case 'move': {
      // Apply move to all members
      for (const member of this.members) {
        const changes = member.dispatch(action)
        if (changes) {
          allChanges.push(...changes.changes)
        }
      }
      // Bounds are affected by move
      this._bounds = null
      break
    }
    
    case 'scale':
    case 'resize':
    case 'rotate': {
      // Apply to all members
      for (const member of this.members) {
        const changes = member.dispatch(action)
        if (changes) {
          allChanges.push(...changes.changes)
        }
      }
      // Bounds are affected
      this._bounds = null
      break
    }
    
    case 'select':
    case 'deselect': {
      // Selection doesn't affect bounds
      for (const member of this.members) {
        const changes = member.dispatch(action)
        if (changes) {
          allChanges.push(...changes.changes)
        }
      }
      // Don't invalidate bounds - position didn't change
      break
    }
    
    case 'setStyle': {
      // Style changes don't affect bounds
      for (const member of this.members) {
        const changes = member.dispatch(action)
        if (changes) {
          allChanges.push(...changes.changes)
        }
      }
      // Don't invalidate bounds
      break
    }
    
    case 'addMember': {
      // New member affects bounds
      const newMember = action.member
      this.members.push(newMember)
      this._bounds = null
      break
    }
    
    case 'removeMember': {
      // Removing member affects bounds
      const index = this.members.findIndex(m => m.id === action.memberId)
      if (index !== -1) {
        this.members.splice(index, 1)
        this._bounds = null
      }
      break
    }
    
    default: {
      // For unknown actions, check if it's position-changing
      if (POSITION_CHANGING_ACTIONS.has(action.type)) {
        this._bounds = null
      }
      
      // Apply to all members
      for (const member of this.members) {
        const changes = member.dispatch(action)
        if (changes) {
          allChanges.push(...changes.changes)
        }
      }
    }
  }
  
  return {
    action,
    targetId: this.id,
    timestamp: Date.now(),
    changes: allChanges,
  }
}
```

### Step 3: Alternative: Centralized Invalidation Logic
Create a helper method for cleaner code.

```typescript
export class VirtualGroup implements IRenderable {
  private _bounds: Bounds | null = null
  private boundsDirty: boolean = false
  
  private invalidateBounds(): void {
    this._bounds = null
    this.boundsDirty = true
  }
  
  private markBoundsClean(): void {
    this.boundsDirty = false
  }
  
  public dispatch(action: TAction): TChanges | null {
    const allChanges: TChange[] = []
    let boundsAffected = false
    
    // Determine if bounds are affected before processing
    boundsAffected = this.isBoundsAffected(action)
    
    // Process action on all members
    for (const member of this.members) {
      const changes = member.dispatch(action)
      if (changes) {
        allChanges.push(...changes.changes)
      }
    }
    
    // Invalidate bounds only if affected
    if (boundsAffected) {
      this.invalidateBounds()
    }
    
    return {
      action,
      targetId: this.id,
      timestamp: Date.now(),
      changes: allChanges,
    }
  }
  
  private isBoundsAffected(action: TAction): boolean {
    // Position-changing actions always affect bounds
    if (POSITION_CHANGING_ACTIONS.has(action.type)) {
      return true
    }
    
    // Member changes affect bounds
    if (action.type === 'addMember' || action.type === 'removeMember') {
      return true
    }
    
    // Group structural changes affect bounds
    if (action.type === 'ungroup' || action.type === 'regroup') {
      return true
    }
    
    // Style, selection, and other actions don't affect bounds
    return false
  }
  
  get localBounds(): Bounds {
    if (this._bounds === null || this.boundsDirty) {
      this._bounds = this.calculateBounds()
      this.markBoundsClean()
    }
    return this._bounds
  }
  
  private calculateBounds(): Bounds {
    if (this.members.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const member of this.members) {
      const b = member.localBounds
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }
}
```

### Step 4: Lazy Bounds Calculation
Ensure bounds are only calculated when actually needed.

```typescript
export class VirtualGroup implements IRenderable {
  private _bounds: Bounds | null = null
  private boundsVersion: number = 0
  private lastCalculatedVersion: number = -1
  
  private invalidateBounds(): void {
    this.boundsVersion++
  }
  
  get localBounds(): Bounds {
    // Only recalculate if invalidation occurred since last calculation
    if (this._bounds === null || this.lastCalculatedVersion !== this.boundsVersion) {
      this._bounds = this.calculateBounds()
      this.lastCalculatedVersion = this.boundsVersion
    }
    return this._bounds
  }
  
  // Also cache world bounds if needed frequently
  private _worldBounds: Bounds | null = null
  private lastWorldTransform: Matrix | null = null
  
  get worldBounds(): Bounds {
    const currentTransform = this.container.transform.worldTransform
    
    // Only recalculate if transform changed or bounds were invalidated
    if (this._worldBounds === null || 
        this.lastCalculatedVersion !== this.boundsVersion ||
        !this.transformsEqual(this.lastWorldTransform, currentTransform)) {
      this._worldBounds = this.calculateWorldBounds()
      this.lastWorldTransform = currentTransform.clone()
    }
    
    return this._worldBounds
  }
  
  private transformsEqual(a: Matrix | null, b: Matrix): boolean {
    if (!a) return false
    return a.a === b.a && a.b === b.b && a.c === b.c && 
           a.d === b.d && a.tx === b.tx && a.ty === b.ty
  }
}
```

---

## Testing Checklist

- [ ] Bounds recalculate after move action
- [ ] Bounds recalculate after resize action
- [ ] Bounds recalculate after rotate action
- [ ] Bounds recalculate after member added
- [ ] Bounds recalculate after member removed
- [ ] Bounds don't recalculate after select action
- [ ] Bounds don't recalculate after style change
- [ ] Bounds cache is used correctly
- [ ] World bounds update correctly with transform changes

---

## Performance Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Select VirtualGroup | Bounds recalc | Cache hit | ~100% reduction |
| Style change | Bounds recalc | Cache hit | ~100% reduction |
| Move VirtualGroup | Bounds recalc | Bounds recalc | No change (correct) |
| Complex group operations | Multiple recalcs | Minimal recalcs | ~70% reduction |

---

## Files to Modify

- `apps/spa/src/features/canvas-crdt/renderables/virtual-group.class.ts`

## Estimated Effort

1 day (including testing)
