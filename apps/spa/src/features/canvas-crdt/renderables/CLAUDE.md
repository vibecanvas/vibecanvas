# Renderables

PixiJS visual elements that render CRDT data to the canvas.

## Why This Structure?

### The Problem

Canvas elements need to:
- **Render** graphics (PixiJS)
- **Respond** to input (click, drag, resize)
- **Sync** with CRDT (changes from self or others)
- **Support undo** (snapshots and restoration)

Putting all this in one class creates complexity. Different shapes share 90% of logic but differ in drawing.

### The Solution: Interface + Abstract Class + Concrete

```
┌───────────────────────────────────────────────────────────────────┐
│                      INTERFACES                                   │
│  IRenderable: id, container, destroy()                           │
│  ITransformable: bounds, position, rotation, dispatch(), etc.    │
│  IActionable: supportedActions, canApply(), dispatch()           │
└────────────────────────────┬──────────────────────────────────────┘
                             │ implements
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                   AElement (Abstract)                             │
│  • Container setup              • Snapshot capture/restore        │
│  • Command input attachment     • Selection state                 │
│  • TransformBox management      • Coordinate helpers              │
└────────────────────────────┬──────────────────────────────────────┘
                             │ extends
                             ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  RectElement   │  │ EllipseElement │  │ DiamondElement │
│  • redraw()    │  │ • redraw()     │  │ • redraw()     │
│  • dimensions  │  │ • dimensions   │  │ • dimensions   │
│  • setResize() │  │ • setResize()  │  │ • setResize()  │
└────────────────┘  └────────────────┘  └────────────────┘
```

**Why this separation?**
- **Interfaces define contracts**: Anything that implements ITransformable can be selected, transformed, snapshotted
- **Abstract class provides shared behavior**: 90% of logic lives in AElement
- **Concrete classes only differ in shape-specific code**: Drawing and resize math

---

## Key Design: ITransformable

Both **elements** and **groups** implement `ITransformable`:

```ts
interface ITransformable extends ISelectable, IActionable {
  // Bounds
  readonly worldBounds: Rectangle     // AABB in world space
  readonly localBounds: Bounds        // Local space bounds

  // Transform state
  readonly worldPosition: Point       // Position in world
  readonly rotation: number           // Radians
  readonly dimensions: TDimensions    // { w, h }

  // Pivots for rotation
  readonly localPivot: Point          // Rotation center in local space
  readonly worldPivot: Point          // Rotation center in world space

  // Mutations via actions
  dispatch(action: TAction): TChanges | null

  // Undo support
  captureSnapshot(): TSnapshot
  restoreSnapshot(snapshot: TSnapshot): TChanges
}
```

**Why not just AElement?**

VirtualGroup (runtime group wrapper) also needs to be transformable. With ITransformable:
- TransformBox works on any ITransformable (element OR group)
- Commands work on any ITransformable
- Selection logic is uniform

```ts
// VirtualGroup implements ITransformable
class VirtualGroup implements ITransformable {
  dispatch(action: TAction): TChanges {
    // Dispatch to all members, aggregate changes
    return members.map(m => m.dispatch(action)).flat()
  }
}
```

---

## Key Design: dispatch() Returns TChanges

The Action/Dispatch pattern separates **visual updates** from **CRDT persistence**:

```ts
interface IActionable {
  dispatch(action: TAction): TChanges | null
}

type TAction =
  | { type: 'setPosition', position: Point }
  | { type: 'setDimensions', dimensions: TDimensions }
  | { type: 'setRotation', angle: number }
  | { type: 'setScale', scale: Point, initialBounds: Rectangle }
  // ...

type TChanges = {
  action: TAction
  targetId: string
  timestamp: number
  changes: TCRDTChange[]  // Array of { path, newValue, oldValue }
}
```

### How It Works

```ts
// In command (during drag)
case 'pointermove':
  // 1. Calculate new position
  const newPos = calculatePosition(ctx, startWorld)

  // 2. Visual update + get CRDT changes
  const changes = target.dispatch({
    type: 'setPosition',
    position: newPos
  })

  // 3. Accumulate changes (don't persist yet)
  if (changes) allChanges.push(...changes.changes)
  return true

// At boundary (pointerup)
case 'pointerup':
  // 4. Persist all changes to CRDT at once
  applyChangesToCRDT(canvas.handle, allChanges)

  // 5. Record undo
  canvas.undoManager.record({ ... })
  return true
```

**Why this pattern?**

1. **Performance**: 60fps drag doesn't need 60 CRDT writes
2. **Atomicity**: Whole gesture succeeds or fails together
3. **Undo granularity**: One undo = one gesture, not one per frame
4. **Testability**: Actions are pure data, easy to unit test

---

## Key Design: Snapshots

Snapshots capture element state for undo/redo:

```ts
type TSnapshot = {
  elements: Record<string, TElement>
  groups: Record<string, TGroup>
}
```

### Capture at Start, Restore at Undo

```ts
// At start of gesture (pointerdown)
const snapshots = new Map<string, TSnapshot>()
for (const target of targets) {
  snapshots.set(target.id, target.captureSnapshot())
}

// At end (pointerup)
canvas.undoManager.record({
  label: 'Move',
  undo: () => {
    // Restore from captured snapshots
    for (const [id, snapshot] of snapshots) {
      const target = findTarget(id)
      const changes = target.restoreSnapshot(snapshot)
      applyChangesToCRDT(canvas.handle, changes.changes)
    }
  },
  redo: () => {
    // Apply the original changes
    applyChangesToCRDT(canvas.handle, allChanges)
  }
})
```

**Why snapshots instead of inverse operations?**

- **Reliable**: Always restores to exact prior state
- **Simple**: No need to compute inverse for each action type
- **Handles any change**: Works for position, rotation, dimensions, style, etc.

---

## Folder Structure

```
renderables/
├── renderable.interface.ts      # IRenderable base interface
├── transformable.interface.ts   # ITransformable, IActionable, TAction types
├── element.abstract.ts          # AElement base class
├── virtual-group.class.ts       # VirtualGroup (group ITransformable)
├── math.util.ts                 # Shared geometry calculations
│
├── elements/                    # Element implementations
│   └── rect/
│       ├── rect.class.ts        # RectElement extends AElement
│       ├── rect.draw.ts         # Graphics rendering
│       └── rect.math.ts         # Resize calculations
│
├── transform-box/               # Selection handles
│   ├── transform-box.ts         # Works on any ITransformable
│   ├── transform-box.math.ts    # Handle positioning
│   └── multi-transform-box.ts   # Multi-selection (multiple ITransformables)
│
└── selection-area/              # Marquee selection
    └── selection-area.class.ts
```

---

## AElement Base Class

All canvas elements extend this:

```ts
abstract class AElement<TType extends TElementData['type']>
  implements IRenderable, ITransformable, IActionable {

  // Identity
  readonly id: string
  container: Container
  element: TBackendElementOf<TType>  // CRDT data reference (not copy)
  canvas: Canvas

  // State flags
  isSelected: boolean
  isDragging: boolean
  isResizing: boolean
  isRotating: boolean

  // Selection UI
  transformBox: TransformBox | null

  // Input handling - via setupPointerListeners() method
  // Uses buildPointerContext() and runCommands() from command.helper.ts

  // Abstract methods - implement in subclass
  abstract get dimensions(): TDimensions
  abstract set dimensions(dim: TDimensions)
  abstract redraw(): void
  abstract get supportedActions(): ReadonlySet<TActionType>
  abstract dispatch(action: TAction): TChanges | null
}
```

**Why `element` is a reference, not a copy?**

The `element` property points directly to the CRDT document's element object. When CRDT changes are applied via `applyPatches()`, the element reference is updated. Renderables read from `this.element` in `redraw()` to reflect latest state.

```ts
// In applyPatches() - updates the reference
renderable.element = doc.elements[id] as any

// In redraw() - reads from the reference
const { data, style } = this.element
this.graphics.fill(style.backgroundColor)
```

---

## Adding New Element Types

### 1. Create folder

```
elements/mytype/
├── mytype.class.ts    # MytypeElement extends AElement<'mytype'>
├── mytype.draw.ts     # Graphics rendering
└── mytype.math.ts     # Resize calculations (if different from rect)
```

### 2. Implement class

```ts
// mytype.class.ts
export class MytypeElement extends AElement<'mytype'> {
  graphics: Graphics = new Graphics()

  constructor(element: TBackendElementOf<'mytype'>, canvas: Canvas) {
    super(element, canvas, [cmdSelectOnClick, cmdDragSelection])
    this.container.addChild(this.graphics)
    this.redraw()

    this.transformBox = new TransformBox(this, canvas)
    this.container.addChild(this.transformBox.container)
  }

  get dimensions() {
    return { w: this.element.data.w, h: this.element.data.h }
  }

  set dimensions(dim: TDimensions) {
    this.element.data.w = dim.w
    this.element.data.h = dim.h
    this.redraw()
  }

  get supportedActions(): ReadonlySet<TActionType> {
    return new Set(['setPosition', 'setDimensions', 'setRotation'])
  }

  canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type)
  }

  dispatch(action: TAction): TChanges | null {
    // Handle action, update visuals, return CRDT changes
  }

  redraw() {
    this.graphics.clear()
    const { data, style } = this.element
    // Draw using PixiJS Graphics API
  }
}
```

### 3. Register in factory

```ts
// canvas/element.patch.ts
function createElementRenderable(element: TElement, canvas: Canvas) {
  switch (element.data.type) {
    case 'rect': return new RectElement(...)
    case 'mytype': return new MytypeElement(...)  // Add here
  }
}
```

### 4. Add to cmdDrawNew

```ts
// input-commands/cmd.draw-new.ts
function createElementForTool(tool: Tool, ...): TElement {
  switch (tool) {
    case 'mytype': return { data: { type: 'mytype', ... }, ... }
  }
}
```

---

## TransformBox

Shows resize/rotate handles around any ITransformable:

```ts
class TransformBox {
  container: Container
  mode: 'full' | 'frame'

  constructor(target: ITransformable, canvas: Canvas)

  show(): void
  hide(): void
  setMode(mode: 'full' | 'frame'): void
  redraw(): void  // Repositions handles based on target.localBounds
}
```

**Why modes?**

- `'full'`: All handles visible (single selection)
- `'frame'`: Only outline visible (when element is part of multi-selection)

### Handle Positions

```
     [rotate]
        |
  [nw]--[n]--[ne]
    |         |
   [w]       [e]
    |         |
  [sw]--[s]--[se]
```

---

## Pivot System

Elements use **center pivot** for rotation:

```
Container position = element.x + element.data.w/2, element.y + element.data.h/2
Graphics drawn from (-w/2, -h/2) to (w/2, h/2)
```

**Why center pivot?**

Rotating around center is the most intuitive behavior. No offset calculations needed - container.rotation just works.

---

## Design Principles

### 1. Renderables Don't Persist

Renderables update visuals and return `TChanges`. Commands persist to CRDT at boundaries:

```ts
// Renderable (element.abstract.ts)
dispatch(action: TAction): TChanges | null {
  // Update visuals
  this.container.x = ...
  this.redraw()

  // Return changes (don't persist)
  return { changes: [...] }
}

// Command (cmd.drag-selection.ts)
case 'pointerup':
  // Persist at boundary
  applyChangesToCRDT(canvas.handle, allChanges)
```

### 2. Renderables Read from CRDT

The `element` property is a reference to CRDT data. On CRDT changes:

```ts
// In applyPatches()
renderable.element = doc.elements[id]
renderable.syncContainerFromElement()
renderable.redraw()
```

This ensures local and remote changes are handled uniformly.

### 3. Interfaces Enable Polymorphism

Commands and TransformBox work on any ITransformable:

```ts
// Works on AElement OR VirtualGroup
function handleDrag(target: ITransformable) {
  const changes = target.dispatch({ type: 'setPosition', position })
  // ...
}
```

### 4. Concrete Classes Only Differ in Shape Logic

RectElement, EllipseElement, etc. only implement:
- `redraw()` - Shape-specific drawing
- `dimensions` getter/setter - Shape-specific size
- `dispatch()` - May have shape-specific action handling

All other behavior (selection, snapshots, input) comes from AElement.
