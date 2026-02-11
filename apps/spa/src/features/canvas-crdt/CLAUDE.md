# Canvas CRDT Feature

Real-time collaborative canvas using Automerge CRDT for conflict-free synchronization.

## Why This Architecture?

### Separation of Concerns

The canvas-crdt feature is designed around **separating effects from logic**:

```
┌────────────────────────────────────────────────────────────────────┐
│                        PURE LOGIC (no side effects)                │
│  • Commands: What happens when user drags? Just math and state.    │
│  • Renderables: How to draw a rect? Just graphics calls.           │
│  • Managers: How to track groups? Just data structures.            │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                        EFFECTS (side effects)                       │
│  • CRDT: handle.change(doc => ...) - persists to network/storage   │
│  • Store: setStore(...) - updates reactive UI state                 │
│  • Canvas: app.stage.addChild(...) - mutates PixiJS scene graph    │
└────────────────────────────────────────────────────────────────────┘
```

**Why separate?**
1. **Testable**: Pure logic can be unit tested without mocking PixiJS/CRDT
2. **Predictable**: Effects happen at known boundaries (end of command)
3. **Debuggable**: Logic errors vs sync errors are easy to distinguish
4. **Collaborative**: CRDT effects can be deferred, batched, or replayed

---

## Architecture Overview

```
canvas-crdt/
├── Canvas.tsx              # React wrapper - manages DocHandle lifecycle
├── canvas/                 # Canvas core - PixiJS setup & sync
├── input-commands/         # Command pattern - user interaction logic
├── managers/               # Domain managers - group lifecycle, undo
├── renderables/            # Visual elements - PixiJS rendering
├── changes/                # CRDT change application
├── store/                  # Reactive state slice
└── types/                  # Shared types (actions, snapshots)
```

### Data Flow

```
User Input
    │
    ▼
┌─────────────────┐
│  InputCommand   │  Pure logic: calculate new positions, validate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Renderable     │  Visual update: move container, redraw graphics
│  (dispatch)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CRDT Effect    │  Persist: handle.change(doc => ...) at end
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store Effect   │  React: setStore('selectedIds', [...])
└─────────────────┘
```

---

## Key Design Decisions

### 1. Commands Own Interaction State

Commands are pure functions with closure state. They don't depend on global state to track "am I dragging?" - they track it themselves:

```ts
// Good: Command owns its state
let isDragging = false
let startPos: Point | null = null

export const cmdDrag: InputCommand = (ctx) => {
  if (ctx.eventType === 'pointerdown') {
    isDragging = true
    startPos = ctx.worldPos.clone()
    return true
  }
  // ...
}
```

**Why?** This makes commands self-contained and prevents race conditions between commands.

### 2. Managers Handle Cross-Cutting Concerns

Managers (GroupManager, UndoManager) handle concerns that span multiple elements:

```ts
// GroupManager handles:
// - Which elements belong to which group?
// - What happens when you select a group?
// - How do nested groups work?

canvas.groupManager.group(selectedIds)  // Create group
canvas.groupManager.ungroup(groupId)    // Dissolve group
```

**Why managers instead of methods on Canvas?**
- **Single Responsibility**: Canvas handles PixiJS, Manager handles domain logic
- **Testable**: Managers can be unit tested with mock canvas
- **Extensible**: New managers (LayerManager, HistoryManager) follow same pattern

### 3. Selection is Just IDs

The store holds `selectedIds: string[]` which can contain element IDs OR group IDs:

```ts
// Single element selected
selectedIds = ['element-abc']

// Group selected (group ID, not member IDs)
selectedIds = ['group-xyz']

// Multi-selection (multiple ungrouped elements)
selectedIds = ['element-abc', 'element-def']
```

**Why not separate `selectedGroupId`?**
- Simpler model: one array, one source of truth
- Uniform: groups and elements are both "selectable things"
- Flexible: multi-select can mix elements and groups (future)

### 4. Effects at Boundaries

Commands do visual updates immediately but defer CRDT writes to `pointerup`:

```ts
// During drag (pointermove):
target.dispatch({ type: 'setPosition', position })  // Visual only

// At end (pointerup):
applyChangesToCRDT(canvas.handle, allChanges)       // Persist
canvas.undoManager.record({ undo, redo })           // History
```

**Why defer?**
- **Performance**: CRDT writes are batched, not per-pixel
- **Atomicity**: Either the whole drag persists or nothing does
- **Undo**: One undo = one gesture, not one undo per frame

---

## Folder Documentation

Each folder has its own CLAUDE.md with detailed patterns:

- **`input-commands/CLAUDE.md`** - Command pattern, event handling
- **`canvas/CLAUDE.md`** - Canvas class, sync, patches
- **`managers/CLAUDE.md`** - GroupManager, UndoManager
- **`renderables/CLAUDE.md`** - Visual elements, TransformBox

---

## Quick Reference

### Creating New Elements
```ts
// 1. Add to CRDT
canvas.handle.change(doc => {
  doc.elements[id] = createElement(id, x, y, data, style)
})
// 2. applyPatches() auto-creates renderable
```

### Selecting
```ts
// Element
setStore('canvasSlice', 'selectedIds', [elementId])

// Group (by group ID, not member IDs)
setStore('canvasSlice', 'selectedIds', [groupId])
```

### Grouping
```ts
const groupId = canvas.groupManager.group(selectedIds)
setStore('canvasSlice', 'selectedIds', [groupId])
```

### Transforming
```ts
// Commands call dispatch() on targets
target.dispatch({ type: 'setPosition', position })
target.dispatch({ type: 'setDimensions', dimensions })
target.dispatch({ type: 'setRotation', angle })

// Returns TChanges for CRDT batching
```
