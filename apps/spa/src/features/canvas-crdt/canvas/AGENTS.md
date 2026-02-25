# Canvas Core

The canvas folder contains the main Canvas class and synchronization logic.

## Why This Structure?

### Separating Setup from Runtime

```
canvas/
├── canvas.ts              # Runtime: Canvas class, PixiJS app
├── setup.doc-sync.ts      # Setup: Initial load, store sync, CRDT events
├── setup.resize-observer.ts
└── element.patch.ts       # Sync: CRDT patches → renderable updates
```

**Why separate?**
- `canvas.ts` is the **runtime** - methods, state, cleanup
- `setup.*.ts` files are **initialization** - one-time wiring
- `element.patch.ts` is **synchronization** - pure functions for patch handling

This separation makes the Canvas class smaller and each concern testable independently.

---

## canvas.ts

The main Canvas class - owns PixiJS application and coordinates everything.

### Why a Class?

The Canvas is genuinely stateful:
- Owns PixiJS Application lifecycle
- Holds element Map (id → Renderable)
- Manages cleanup functions
- Coordinates managers

A class makes this state explicit and provides clear lifecycle (create → use → cleanup).

### Structure

```ts
class Canvas {
  // PixiJS
  app: Application
  topLayer: RenderLayer      // Selection UI, transform boxes
  bottomLayer: RenderLayer   // Drawing elements

  // State
  elements: Map<string, AElement>
  previewDrawing: AElement | null

  // Managers
  groupManager: GroupManager
  undoManager: UndoManager

  // CRDT
  handle: DocHandle<TCanvasDoc>

  // Lifecycle
  static async create(params): Promise<Canvas>
  cleanup(): void
}
```

### Input Handling

Input is handled via helper functions from `command.helper.ts`:

```ts
import { buildPointerContext, buildWheelContext, buildKeyboardContext, runCommands } from "../input-commands/command.helper"

// In setupInputHandling():
const pointerHandler = (e: FederatedPointerEvent) => {
  const ctx = buildPointerContext(this, this, e, 'stage')
  runCommands([cmdPanDrag, cmdDrawNew, cmdSelectBox], ctx)
}
stage.on('pointerdown', pointerHandler)
// ... etc
```

### Layer System

```
Stage
├── bottomLayer (RenderLayer)  ← Elements live here
│   ├── RectElement
│   ├── EllipseElement
│   └── ...
│
└── topLayer (RenderLayer)     ← UI overlays live here
    ├── SelectionArea
    ├── MultiTransformBox
    └── VirtualGroup containers
```

**Why two layers?**
- **Z-order**: Selection UI always above content
- **Performance**: Can update layers independently
- **Clarity**: Drawing content vs UI chrome

---

## setup.doc-sync.ts

Initializes elements from CRDT and keeps store in sync.

### Why a Separate Setup Function?

Setup logic is **run-once** code that wires things together. It doesn't belong in the Canvas class because:
1. It's initialization, not runtime behavior
2. It creates side effects (event listeners)
3. It returns cleanup functions

```ts
export function setupDocSync(canvas: Canvas, handle: DocHandle) {
  // 1. Initialize elements from document
  for (const element of Object.values(handle.doc().elements)) {
    // Create renderables...
  }

  // 2. Initialize groups
  canvas.groupManager.initializeFromDoc()

  // 3. Listen for CRDT changes
  handle.on('change', (payload) => {
    applyPatches(canvas, doc, payload.patches)
    canvas.groupManager.handlePatches(payload.patches)
  })

  // 4. Listen for store changes (selection)
  return listenLocalStore(canvas)
}
```

### Selection Effect

The selection effect is **reactive** - it runs whenever `store.canvasSlice.selectedIds` changes:

```ts
createEffect(() => {
  const selectedIds = store.canvasSlice.selectedIds

  // Deselect everything first
  canvas.groupManager.groups.forEach(g => g.deselect())
  canvas.elements.forEach(r => r.isSelected = false)

  // Handle based on what's selected
  if (selectedIds.length === 1) {
    const id = selectedIds[0]

    // Is it a group?
    const virtualGroup = canvas.groupManager.groups.get(id)
    if (virtualGroup) {
      virtualGroup.select()
      canvas.multiTransformBox.hide()
      return
    }

    // It's an element
    const element = canvas.elements.get(id)
    if (element) {
      element.isSelected = true
      element.transformBox?.setMode('full')
    }
    canvas.multiTransformBox.hide()
    return
  }

  // Multi-selection
  if (selectedIds.length > 1) {
    // Show MultiTransformBox for multiple elements
    canvas.multiTransformBox.members = ...
    canvas.multiTransformBox.show()
  }
})
```

**Why an effect instead of direct calls?**
- **Reactive**: Automatically updates when store changes
- **Centralized**: One place handles all selection changes
- **Consistent**: Same logic for user clicks, undo, API calls

---

## element.patch.ts

Converts CRDT patches to canvas mutations.

### Why a Separate Patch Handler?

CRDT patches are low-level:
```ts
{ action: 'put', path: ['elements', 'abc', 'x'], value: 100 }
{ action: 'put', path: ['elements', 'abc', 'y'], value: 200 }
{ action: 'del', path: ['elements', 'abc'] }
```

We need to:
1. Group patches by element ID
2. Detect create/update/delete operations
3. Create or update renderables appropriately

```ts
export function applyPatches(canvas, doc, patches) {
  // Group patches by element
  const elementPatches = groupByElement(patches)

  for (const [elementId, patches] of elementPatches) {
    if (isDelete(patches)) {
      handleDelete(canvas, elementId)
    } else if (isCreate(patches)) {
      handleCreate(canvas, doc.elements[elementId])
    } else {
      handleUpdate(canvas, elementId, doc.elements[elementId])
    }
  }
}
```

**Why pure functions?**
- **Testable**: Pass mock canvas, get predictable results
- **Debuggable**: Log patches, trace what happened
- **Reusable**: Same logic for local and remote patches

---

## Design Principles

### 1. Canvas is the Coordinator

Canvas doesn't do the work - it coordinates:
- Handles input via helper functions and commands
- Delegates groups to GroupManager
- Delegates undo to UndoManager
- Delegates rendering to Renderables

### 2. Effects Live in Setup

Side effects (event listeners, reactive effects) are created in setup functions, not in constructors. This makes lifecycle explicit.

### 3. Cleanup is First-Class

Every setup returns cleanup functions, collected in `this.cleanupFns`:

```ts
const cleanupDocSync = setupDocSync(this, handle)
this.cleanupFns.push(cleanupDocSync)

// Later:
cleanup(): void {
  this.cleanupFns.forEach(fn => fn())
}
```

### 4. CRDT is Source of Truth

Canvas reads from CRDT, never caches data:

```ts
// Good: Read from CRDT
const doc = canvas.handle.doc()
const element = doc.elements[id]

// Bad: Cache element data
this.cachedElements = { ...doc.elements }  // Gets stale!
```

Renderables hold a **reference** to their element in the doc, not a copy.
