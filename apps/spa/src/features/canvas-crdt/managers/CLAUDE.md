# Managers

Domain-specific logic that spans multiple elements or handles cross-cutting concerns.

## Why Managers?

### The Problem

Canvas operations often involve multiple elements:
- **Grouping**: Create a group from N elements, track membership
- **Undo**: Record before/after state for any operation
- **Layers**: Reorder z-index across multiple elements

Putting this logic in Canvas.ts would make it a god object. Putting it in individual elements creates coupling.

### The Solution: Managers

Managers are **domain experts** that:
1. Own a specific domain (groups, undo, layers)
2. Have access to Canvas for element lookup
3. Encapsulate complex multi-element logic
4. Expose simple public APIs

```
┌─────────────────────────────────────────────────────────────────┐
│                         Canvas                                   │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ GroupManager│  │ UndoManager │  │   Future    │              │
│  │             │  │             │  │ Managers    │              │
│  │ • groups    │  │ • history   │  │             │              │
│  │ • group()   │  │ • record()  │  │             │              │
│  │ • ungroup() │  │ • undo()    │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                                       │
│         └────────────────┼───────────────────────────────────────┤
│                          │                                       │
│                    canvas.elements                               │
│                    canvas.handle (CRDT)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## GroupManager

Manages group lifecycle and membership.

### Why GroupManager?

Groups are **virtual containers** - they don't exist in the PixiJS scene graph as containers. Instead:
- Elements have a `groupId` property pointing to their group
- Groups exist in CRDT as `doc.groups[groupId]`
- VirtualGroup is a runtime representation for selection/transform

**Why not actual PixiJS Container nesting?**
- **CRDT sync**: Flat elements are easier to sync than nested hierarchies
- **Flexibility**: An element can change groups without reparenting
- **Performance**: No deep traversal for hit testing

### API

```ts
class GroupManager {
  groups: Map<string, VirtualGroup>  // Runtime group instances

  // Create a group from selected elements
  group(elementIds: string[]): string | null

  // Dissolve a group, returns member IDs
  ungroup(groupId: string): string[]

  // Find group for an element
  getGroupForElement(elementId: string): VirtualGroup | null

  // Find outermost group (for nested groups)
  getOutermostGroupForSelectable(elementId: string): VirtualGroup | null

  // Handle CRDT patches (create/delete groups on remote changes)
  handlePatches(patches: any[]): void
}
```

### How Groups Work

```
CRDT Document                    Runtime
─────────────────────────────────────────────────────
doc.groups = {                   groupManager.groups = Map {
  'group-abc': {                   'group-abc' → VirtualGroup {
    id: 'group-abc',                 id: 'group-abc',
    name: 'My Group',                members: [RectElement, RectElement],
    parentGroupId: null              transformBox: TransformBox,
  }                                  container: Container
}                                  }
                                 }

doc.elements = {
  'elem-1': { groupId: 'group-abc', ... },
  'elem-2': { groupId: 'group-abc', ... },
}
```

### Selection with Groups

When user clicks a grouped element:
1. `cmd.select-element` detects element has `groupId`
2. Finds outermost group via `groupManager.getOutermostGroupForSelectable()`
3. Sets `selectedIds = [groupId]` (just the group ID)
4. `setup.doc-sync` effect sees group ID, calls `virtualGroup.select()`
5. VirtualGroup's TransformBox shows

```ts
// In cmd.select-element.ts
if (virtualGroup) {
  updateSelectedIds([virtualGroup.id])  // Select by group ID
} else {
  updateSelectedIds([clickedId])        // Select by element ID
}
```

---

## UndoManager

Records operations for undo/redo.

### Why UndoManager?

Undo is inherently cross-cutting:
- A single drag might move multiple elements
- Grouping affects N elements + creates a group
- Need consistent before/after snapshots

### API

```ts
class UndoManager {
  record(entry: {
    label: string
    undo: () => void
    redo: () => void
  }): void

  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
}
```

### Usage Pattern

```ts
// In command (e.g., cmdDragSelection)
const capturedSnapshots = new Map(state.snapshots)
const capturedChanges = [...allChanges]

canvas.undoManager.record({
  label: 'Move',
  undo: () => restoreFromSnapshots(canvas, capturedSnapshots),
  redo: () => applyChangesToCRDT(canvas.handle, capturedChanges),
})
```

**Key insight**: Capture state at record time, not at undo time. The closures hold the exact before/after state.

---

## Adding New Managers

### Pattern

```ts
// managers/layer-manager.ts
export class LayerManager {
  constructor(
    private readonly canvas: Canvas,
    private readonly handle: DocHandle<TCanvasDoc>
  ) {}

  // Public API
  bringToFront(elementId: string): void { ... }
  sendToBack(elementId: string): void { ... }
  moveUp(elementId: string): void { ... }
  moveDown(elementId: string): void { ... }

  // Cleanup
  destroy(): void { ... }
}
```

### Registration in Canvas

```ts
// canvas/canvas.ts
export class Canvas {
  groupManager!: GroupManager
  undoManager = new UndoManager()
  layerManager!: LayerManager  // New manager

  private async init({ handle }: TCanvasParams) {
    // ...
    this.groupManager = new GroupManager(this, handle)
    this.layerManager = new LayerManager(this, handle)

    this.cleanupFns.push(() => this.groupManager.destroy())
    this.cleanupFns.push(() => this.layerManager.destroy())
  }
}
```

---

## Design Principles

### 1. Managers Don't Render

Managers handle **logic**, not **visuals**. If a manager needs to show something, it creates a Renderable (like VirtualGroup creates a TransformBox).

### 2. Managers Own Their CRDT Writes

Managers write to CRDT directly when needed:

```ts
// GroupManager.group() writes to CRDT
this.handle.change(doc => {
  doc.groups[groupId] = createGroup(groupId, name)
  for (const id of elementIds) {
    doc.elements[id].parentGroupId = groupId
  }
})
```

This keeps CRDT logic close to the domain logic.

### 3. Managers React to Patches

Managers listen to CRDT changes to handle remote updates:

```ts
// In setup.doc-sync.ts
handle.on('change', (payload) => {
  canvas.groupManager.handlePatches(payload.patches)
})
```

This ensures local and remote changes are handled uniformly.

### 4. Managers Are Testable

Since managers take Canvas as a dependency, they can be tested with a mock:

```ts
const mockCanvas = {
  elements: new Map([...]),
  handle: mockHandle,
}
const manager = new GroupManager(mockCanvas as Canvas, mockHandle)
const groupId = manager.group(['a', 'b'])
expect(mockCanvas.elements.get('a').parentGroupId).toBe(groupId)
```
