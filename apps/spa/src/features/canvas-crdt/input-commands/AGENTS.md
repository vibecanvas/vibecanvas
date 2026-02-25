# Input Commands

Chain of Responsibility pattern for handling user input.

## Why Commands?

### The Problem

Canvas interactions are complex:
- Multiple event types (pointerdown, pointermove, pointerup, wheel, keyboard)
- Multiple targets (canvas, elements, transform handles)
- Multiple modes (select tool, draw tool, hand tool)
- State that spans events (drag start → drag → drag end)

Putting all this in one handler creates spaghetti.

### The Solution: Command Pattern

Each interaction is a **command** - a self-contained function that:
1. Decides if it handles the event (guards)
2. Maintains its own state (closure)
3. Returns true if handled, false to try next command

```
Event → [cmd1] → false → [cmd2] → false → [cmd3] → true → STOP
```

**Why this pattern?**
- **Composable**: Mix and match commands per target
- **Self-contained**: Each command owns its state
- **Prioritized**: Order in array = priority
- **Testable**: Commands are pure functions

---

## Separating Logic from Effects

Commands follow a strict pattern: **logic during interaction, effects at boundaries**.

### During Interaction (pointermove)

```ts
// Pure logic: calculate new position
const deltaX = ctx.worldPos.x - state.startWorld.x
const deltaY = ctx.worldPos.y - state.startWorld.y

// Visual update only (no persist)
target.dispatch({
  type: 'setPosition',
  position: new Point(initial.x + deltaX, initial.y + deltaY)
})
```

### At Boundary (pointerup)

```ts
// Effect 1: Persist to CRDT
applyChangesToCRDT(canvas.handle, allChanges)

// Effect 2: Record undo
canvas.undoManager.record({ label: 'Move', undo, redo })

// Effect 3: Update store (if needed)
setStore('canvasSlice', 'selectedIds', newSelection)
```

**Why defer effects?**
- **Performance**: 60fps drag doesn't need 60 CRDT writes
- **Atomicity**: Whole gesture succeeds or fails together
- **Undo granularity**: One undo = one gesture

---

## Command Structure

### Files

```
input-commands/
├── types.ts               # InputCommand type, TCommandContext
├── command.helper.ts      # Helper functions: runCommands, buildPointerContext, etc.

├── cmd.zoom.ts            # Wheel zoom
├── cmd.pan.ts             # Wheel pan
├── cmd.pan-drag.ts        # Hand tool drag
├── cmd.tool-select.ts     # Keyboard shortcuts
├── cmd.select-box.ts      # Marquee selection
├── cmd.select-element.ts  # Click to select
├── cmd.select-delete.ts   # Delete/Backspace
├── cmd.draw-new.ts        # Create new elements
├── cmd.drag-selection.ts  # Drag selected elements/groups
├── cmd.group.ts           # Cmd+G / Cmd+Shift+G
├── cmd.resize.ts          # Resize via handles
├── cmd.rotate.ts          # Rotate via handle
├── cmd.scale.ts           # Scale via handles
└── cmd.undo-redo.ts       # Cmd+Z / Cmd+Shift+Z
```

### Signature

```ts
type InputCommand = (ctx: InputContext) => boolean

interface InputContext {
  eventType: 'pointerdown' | 'pointermove' | 'pointerup' | 'wheel' | 'keydown' | 'keyup'
  event: Event
  worldPos: Point | null      // null for keyboard events
  screenPos: Point | null
  startWorld: Point | null    // Set on pointerdown
  commandTarget: TCommandTarget
  canvas: Canvas
  listenerId: string
  modifiers: { shift, ctrl, alt, meta }
}

type TCommandTarget = Canvas | AElement | TransformBox | MultiTransformBox | VirtualGroup
```

---

## Why Commands Own State

Each command maintains its own state in closure:

```ts
// Module-level state (private to this command)
let isDragging = false
let dragTarget: AElement | null = null
let startWorld: Point | null = null

export const cmdDragSelection: InputCommand = (ctx) => {
  switch (ctx.eventType) {
    case 'pointerdown':
      isDragging = true
      startWorld = ctx.worldPos?.clone() ?? null
      dragTarget = findTarget(ctx)
      return true

    case 'pointermove':
      if (!isDragging) return false
      // Use startWorld, dragTarget...
      return true

    case 'pointerup':
      const wasDragging = isDragging
      isDragging = false
      startWorld = null
      dragTarget = null
      return wasDragging
  }
}
```

**Why not store state in context or store?**
- **Isolation**: Commands don't interfere with each other
- **No race conditions**: Only one command "owns" a gesture at a time
- **Simple cleanup**: Reset state on pointerup

---

## Command Chains

Commands are attached using helper functions and event listeners:

```ts
import { buildPointerContext, buildWheelContext, buildKeyboardContext, runCommands } from "./command.helper"

// Canvas stage - pointer events
const pointerHandler = (e: FederatedPointerEvent) => {
  const ctx = buildPointerContext(canvas, canvas, e, 'stage')
  runCommands([cmdPanDrag, cmdDrawNew, cmdSelectBox], ctx)
}
stage.on('pointerdown', pointerHandler)
stage.on('globalpointermove', pointerHandler)
stage.on('pointerup', pointerHandler)

// Canvas stage - wheel events
const wheelHandler = (e: WheelEvent) => {
  e.preventDefault()
  const ctx = buildWheelContext(canvas, canvas, e, 'stage')
  runCommands([cmdZoom, cmdPan], ctx)
}
stage.on('wheel', wheelHandler, { passive: false })

// Element - click/drag on shapes
const elementHandler = (e: FederatedPointerEvent) => {
  e.stopPropagation()
  const ctx = buildPointerContext(canvas, element, e, 'body')
  runCommands([cmdSelectOnClick, cmdDragSelection], ctx)
}
element.container.on('pointerdown', elementHandler)
element.container.on('globalpointermove', elementHandler)
element.container.on('pointerup', elementHandler)

// Keyboard - global shortcuts
const keyboardHandler = (e: KeyboardEvent) => {
  const ctx = buildKeyboardContext(canvas, canvas, e, 'stage')
  runCommands([cmdUndoRedo, cmdGroup, cmdToolSelect, cmdSelectDelete], ctx)
}
window.addEventListener('keydown', keyboardHandler)
window.addEventListener('keyup', keyboardHandler)
```

**Why attach to different targets?**
- **Specificity**: Resize command only runs on resize handles
- **Event bubbling**: Element click before stage click
- **Modularity**: Element commands defined near element code

---

## Type Guards

Commands use type guards to narrow `commandTarget`:

```ts
import { isElementTarget, isVirtualGroupTarget } from "./types"

export const cmdDragSelection: InputCommand = (ctx) => {
  // Only handle element targets
  if (!isElementTarget(ctx.commandTarget)) return false

  const element = ctx.commandTarget  // Now typed as AElement
  // ...
}
```

Available guards:
- `isElementTarget(t)` - AElement
- `isVirtualGroupTarget(t)` - VirtualGroup
- `isTransformBoxTarget(t)` - TransformBox
- `isMultiTransformBoxTarget(t)` - MultiTransformBox
- `isCanvasTarget(t)` - Canvas

---

## Writing a New Command

### 1. Create the File

```ts
// cmd.my-command.ts
import type { InputCommand } from "./types"
import { isElementTarget } from "./types"

// State in closure
let isActive = false

export const cmdMyCommand: InputCommand = (ctx) => {
  // Guard: which events/targets?
  if (!isElementTarget(ctx.commandTarget)) return false

  switch (ctx.eventType) {
    case 'pointerdown':
      return handleDown(ctx)
    case 'pointermove':
      return handleMove(ctx)
    case 'pointerup':
      return handleUp(ctx)
    default:
      return false
  }
}
```

### 2. Export from index.ts

```ts
export { cmdMyCommand } from "./cmd.my-command"
```

### 3. Attach to Target

```ts
// In element or canvas setup
const pointerHandler = (e: FederatedPointerEvent) => {
  e.stopPropagation()
  const ctx = buildPointerContext(canvas, target, e, 'body')
  runCommands([cmdMyCommand, ...otherCommands], ctx)
}
target.container.on('pointerdown', pointerHandler)
target.container.on('globalpointermove', pointerHandler)
target.container.on('pointerup', pointerHandler)
```

---

## Design Principles

### 1. Return Early

Commands should return `false` quickly if they don't handle the event:

```ts
if (store.toolbarSlice.activeTool !== 'select') return false
if (!isElementTarget(ctx.commandTarget)) return false
if (ctx.eventType !== 'pointerdown') return false
// Now handle it...
```

### 2. Capture State at Start

Don't rely on reading state during drag - capture what you need at start:

```ts
// Good: Capture at start
case 'pointerdown':
  initialPositions = targets.map(t => ({ id: t.id, x: t.x, y: t.y }))

case 'pointermove':
  // Use initialPositions, not current t.x, t.y
  const newX = initialPositions[i].x + deltaX
```

### 3. Clean Up on Exit

Always reset state on pointerup, even if no drag happened:

```ts
case 'pointerup':
case 'pointerupoutside':
  const wasDragging = isDragging
  // Always cleanup
  isDragging = false
  target = null
  startWorld = null
  return wasDragging
```

### 4. Effects at End Only

Visual updates during drag, effects on pointerup:

```ts
case 'pointermove':
  target.dispatch({ type: 'setPosition', position })  // Visual only
  return true

case 'pointerup':
  applyChangesToCRDT(canvas.handle, changes)          // Persist
  canvas.undoManager.record({ ... })                   // Undo
  return true
```

---

## Event Bubbling to Parent Groups

When an element belongs to a group, events can bubble up to the parent group's command chain.

### How Bubbling Works

```
User clicks grouped element
    ↓
Element's pointer handler runs its chain via runCommands()
    ↓
cmdDragSelection sees element.parentGroupId exists
    ↓
Command returns false (not handled)
    ↓
Handler checks if not handled && parentGroupId exists
    ↓
Handler emits event to parent VirtualGroup's container
    ↓
Parent VirtualGroup's chain runs with commandTarget = VirtualGroup
    ↓
cmdDragSelection handles VirtualGroup (no parentGroupId) → drags group
```

### Using bubbleImmediate()

Call `ctx.bubbleImmediate()` when you want the parent group to handle the event:

```ts
function handleDown(ctx: Parameters<InputCommand>[0]): boolean {
  if (!ctx.worldPos) return false

  if (isDragableTarget(ctx.commandTarget)) {
    // Element belongs to a group → bubble to parent
    if (ctx.commandTarget.parentGroupId) {
      ctx.bubbleImmediate()
      return false  // Must return false after bubbling
    }

    // No parent → handle normally
    state.targets = [ctx.commandTarget]
    return true
  }

  return false
}
```

### Context Properties

```ts
interface InputContext {
  // ... existing properties ...

  // Bubbling support
  _bubbleRequested: boolean      // Internal flag, set by bubbleImmediate()
  bubbleImmediate: () => void    // Call to request bubbling to parent
}
```

### When to Bubble

- **DO bubble**: When element has `parentGroupId` and you want the group to handle the interaction
- **DON'T bubble**: When handling MultiTransformBox (multi-select) or VirtualGroup directly

### How Bubbling is Implemented

In element and VirtualGroup classes, the pointer handler emits to parent when not handled:

```ts
// In AElement.setupPointerListeners() or VirtualGroup.setupListeners()
const pointerHandler = (e: FederatedPointerEvent) => {
  e.stopPropagation()
  const ctx = buildPointerContext(canvas, this, e, listenerId)
  const handled = runCommands(commands, ctx)

  // If not handled and element has a parent group, emit to parent
  if (!handled && this.parentGroupId) {
    const virtualGroup = canvas.groupManager.groups.get(this.parentGroupId)
    virtualGroup?.container.emit(e.type, e)
  }
}
```

This approach:
1. Uses PixiJS event system for bubbling (emit to parent container)
2. Parent VirtualGroup receives the event and runs its own command chain
3. Continues bubbling if parent also doesn't handle it

---

## Gotchas: VirtualGroup Caching

VirtualGroup caches computed values for performance. When writing commands that interact with groups, be aware of these pitfalls.

### 1. Invalidate Bounds Before Reading

VirtualGroup caches `_bounds` (world bounding box). This cache can be stale from previous operations:

```ts
// BAD: May read stale cached bounds
const bounds = virtualGroup.worldBounds

// GOOD: Invalidate cache first
if (isVirtualGroupTarget(target)) {
  (target as VirtualGroup).invalidateMembers()
}
const bounds = target.worldBounds  // Now fresh
```

**When to invalidate:**
- At the START of a gesture (pointerdown)
- Before capturing initial bounds for transforms
- After external changes to group membership

### 2. Scale Cache Must Persist During Gesture

VirtualGroup uses `_scaleCache` to track each member's initial bounds during a scale operation. This cache must NOT be cleared during the gesture:

```ts
// In VirtualGroup.invalidateMembers():
public invalidateMembers(): void {
  this._members = null
  this._bounds = null
  // DON'T clear _scaleCache here!
}

// Clear scale cache only at END of gesture:
public clearScaleCache(): void {
  this._scaleCache = null
}
```

**Why this matters:**
If `_scaleCache` is cleared during pointermove, the next frame will recapture bounds from already-scaled positions, causing exponential growth.

```
Frame 1: element at (100, 100), scale 1.1 → element moves to (110, 110)
Frame 2: _scaleCache cleared → recaptures bounds as (110, 110)
Frame 2: scale 1.1 from NEW position → element at (121, 121)
Frame 3: ... exponential explosion
```

### 3. Bubbling + TransformBox Targets

When bubbling from a TransformBox, the target hierarchy matters:

```ts
// TransformBox target → target.target is the ITransformable
if (isTransformBoxTarget(ctx.commandTarget)) {
  const actualTarget = ctx.commandTarget.target  // AElement or VirtualGroup

  // Check if THIS target should bubble
  if (actualTarget.parentGroupId) {
    ctx.bubbleImmediate()
    return false
  }
}
```

### 4. Order of Operations in handleDown

For commands that need fresh bounds:

```ts
function handleDown(ctx) {
  // 1. Check for bubbling FIRST
  if (shouldBubble(ctx.commandTarget)) {
    ctx.bubbleImmediate()
    return false
  }

  // 2. Invalidate caches BEFORE reading
  if (isVirtualGroupTarget(target)) {
    target.invalidateMembers()
  }

  // 3. NOW capture bounds (fresh)
  const bounds = target.worldBounds
  state.initialBounds = { ... }

  // 4. Capture snapshots for undo
  captureInitialState([target])

  return true
}
```

### 5. Don't Invalidate During pointermove

Calling `invalidateMembers()` during pointermove can cause:
- Scale cache to be cleared (exponential scaling bug)
- Unnecessary recomputation every frame
- Flicker or jitter in visual updates

```ts
// BAD: Invalidating during drag
case 'pointermove':
  target.invalidateMembers()  // Clears caches every frame!
  target.dispatch({ type: 'scale', ... })

// GOOD: Only invalidate bounds, not scale cache
case 'pointermove':
  target.dispatch({ type: 'scale', ... })
  // VirtualGroup.redraw() handles bound invalidation internally
```
