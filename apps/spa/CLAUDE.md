# SPA - SolidJS Canvas Application

## Commands

```bash
bun dev          # Start dev server on port 3001
bun build        # Build for production
bun serve        # Preview production build
```

## Tech Stack

- **SolidJS** - Reactive UI framework
- **Kobalte** - Accessible UI component library for SolidJS
- **lucide-solid** - Icon library
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool

## Project Structure

```
apps/spa/
├── src/
│   ├── assets/               # Static assets (fonts, images)
│   ├── components/
│   │   └── ui/               # Shared UI components (Toast, etc.)
│   ├── features/             # Feature modules
│   │   ├── canvas/  # PixiJS canvas core
│   │   │   ├── renderables/    # Canvas drawing classes
│   │   │   ├── input-commands/ # Mouse/keyboard command handlers
│   │   │   └── store/          # Canvas viewport state
│   │   ├── context-menu/       # Right-click context menu
│   │   ├── drawings/           # Drawing state management
│   │   ├── floating-drawing-toolbar/  # Tool selection toolbar
│   │   ├── floating-selection-menu/   # Style picker for selected shapes
│   │   ├── info-card/          # Info panel component
│   │   ├── sidebar/            # Canvas list sidebar
│   │   └── vibe-chat/          # Chat feature
│   ├── services/             # WebSocket and external services
│   ├── types/                # Shared TypeScript types
│   ├── App.tsx               # Root component
│   ├── eden.ts               # Type-safe API client
│   ├── index.tsx             # Entry point
│   ├── index.css             # Global styles + Tailwind
│   └── store.ts              # Global store
├── index.html                # HTML template
└── vite.config.ts            # Vite configuration
```

## UI Components

### Kobalte

Accessible, unstyled UI primitives for SolidJS. Documentation: https://kobalte.dev/docs/core/overview/getting-started

```tsx
import { Button } from "@kobalte/core/button";
import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { Select } from "@kobalte/core/select";
import { Tabs } from "@kobalte/core/tabs";
import { Tooltip } from "@kobalte/core/tooltip";
```

**Example usage:**

```tsx
import { Button } from "@kobalte/core/button";

function MyButton() {
  return (
    <Button class="px-4 py-2 bg-blue-500 text-white rounded">
      Click me
    </Button>
  );
}
```

**Dialog example:**

```tsx
import { Dialog } from "@kobalte/core/dialog";

function MyDialog() {
  return (
    <Dialog>
      <Dialog.Trigger class="btn">Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50" />
        <Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          <Dialog.CloseButton>Close</Dialog.CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
```

### lucide-solid

Icon library with 1000+ icons. **Use direct imports for tree-shaking in dev mode:**

```tsx
// CORRECT - direct imports (fast dev server)
import Home from "lucide-solid/icons/home";
import Settings from "lucide-solid/icons/settings";
import ChevronDown from "lucide-solid/icons/chevron-down";

// WRONG - barrel imports (loads ALL icons in dev)
// import { Home, Settings } from "lucide-solid";

function IconExample() {
  return (
    <div class="flex gap-2">
      <Home size={24} />
      <Settings size={24} class="text-gray-500" />
    </div>
  );
}
```

**Finding icon names:**
- Browse icons at https://lucide.dev/icons
- Convert PascalCase → kebab-case for import path:
  - `MousePointer2` → `lucide-solid/icons/mouse-pointer-2`
  - `MoreHorizontal` → `lucide-solid/icons/more-horizontal`
  - `FolderOpen` → `lucide-solid/icons/folder-open`
  - `Trash2` → `lucide-solid/icons/trash-2`

**Icon props:**
- `size` - Width and height (default: 24)
- `color` - Stroke color (or use Tailwind `class="text-*"`)
- `stroke-width` - Stroke width (default: 2)
- `class` - CSS classes

## SolidJS Patterns

### Signals (State)

```tsx
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
}
```

### Effects

```tsx
import { createSignal, createEffect } from "solid-js";

function Logger() {
  const [value, setValue] = createSignal("");

  createEffect(() => {
    console.log("Value changed:", value());
  });

  return <input value={value()} onInput={e => setValue(e.target.value)} />;
}
```

### Derived State (Memos)

```tsx
import { createSignal, createMemo } from "solid-js";

function Derived() {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  return <div>Doubled: {doubled()}</div>;
}
```

### Conditional Rendering

```tsx
import { Show, Switch, Match } from "solid-js";

function Conditional(props: { status: string }) {
  return (
    <>
      <Show when={props.status === "loading"}>
        <Spinner />
      </Show>

      <Switch>
        <Match when={props.status === "success"}>Success!</Match>
        <Match when={props.status === "error"}>Error!</Match>
      </Switch>
    </>
  );
}
```

### Lists

```tsx
import { For } from "solid-js";

function List(props: { items: string[] }) {
  return (
    <ul>
      <For each={props.items}>
        {(item, index) => <li>{index()}: {item}</li>}
      </For>
    </ul>
  );
}
```

### Stores (Complex State)

```tsx
import { createStore } from "solid-js/store";

function TodoApp() {
  const [state, setState] = createStore({
    todos: [] as { id: number; text: string; done: boolean }[],
    filter: "all" as "all" | "active" | "done",
  });

  const addTodo = (text: string) => {
    setState("todos", todos => [...todos, { id: Date.now(), text, done: false }]);
  };

  const toggleTodo = (id: number) => {
    setState("todos", todo => todo.id === id, "done", done => !done);
  };

  return (/* ... */);
}
```

## Global Store & Actions

The app uses a **global store** (`src/store.ts`) with **separate action files** for mutations. The store contains only data and computed getters - all mutations go through action functions.

### Store Structure

```
src/store.ts                    # Global store with slices
src/features/<feature>/store/
├── <feature>.slice.ts          # Type definitions for slice
└── <feature>.actions.ts        # Mutation functions
```

### Store Schema

```ts
// src/store.ts
export const [store, setStore] = createStore<TStore>({
  theme: "light" | "dark",
  sidebarVisible: boolean,

  toolbarSlice: {
    activeTool: Tool,           // 'select' | 'hand' | 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'pen' | 'text' | 'image'
    isCollapsed: boolean,
  },

  canvasSlice: {
    canvasViewport: { [canvasId]: { x, y, scale } },
    canvasViewportActive: TCanvasViewData | null,      // Computed getter
    backendCanvas: { [canvasId]: TBackendCanvas },
    backendCanvasActive: TBackendCanvas | null,        // Computed getter
  },

  drawingSlice: {
    selectedIds: string[],
    mousePositionWorldSpace: { x, y },
    backendDrawings: { [canvasId]: TBackendDrawing[] },
    backendDrawingsActive: TBackendDrawing[],          // Computed getter
  },

  chatSlice: {
    backendChats: { [canvasId]: TBackendChat[] },
    backendChatsActive: TBackendChat[],                // Computed getter
  },

  contextMenuSlice: {
    isOpen: boolean,
    position: { x, y },
    context: 'canvas' | 'shape' | 'selection',
    targetIds: string[],
    registry: ContextMenuRegistry,
  },
});

export const [activeCanvasId, setActiveCanvasId] = createSignal<string | null>(null);
```

### Backend Types

Types are inferred from the database schema (see `src/types/backend.types.ts`):

```ts
import type * as schema from "@vibecanvas/shell/database/schema";

export type TBackendCanvas = typeof schema.canvas.$inferSelect;
export type TBackendDrawing = typeof schema.drawings.$inferSelect;
export type TBackendChat = typeof schema.chats.$inferSelect;
```

### Using Actions (Recommended Pattern)

**DON'T** mutate store directly in components:
```tsx
// BAD - direct mutation in component
setStore("drawingSlice", "selectedIds", [...store.drawingSlice.selectedIds, id]);
```

**DO** use action functions:
```tsx
// GOOD - use actions
import { createDrawing, updateDrawing, deleteDrawing } from "@/features/drawings/store/drawing.actions";

await createDrawing({ id, canvas_id, x, y, data, style });
await updateDrawing(id, { x: newX, y: newY });
await deleteDrawing(id);
```

### Reading Store Reactively

Access store slices directly in `createMemo` or `createEffect` for reactivity:

```tsx
import { store } from "@/store";

// Memo recomputes when store.drawingSlice.backendDrawingsActive changes
const canvasItems = createMemo(() => {
  const drawings = store.drawingSlice.backendDrawingsActive;
  return mapBackendDrawingsToCanvasItems(drawings);
});

// Effect runs when selectedIds changes
createEffect(on(
  () => new Set(store.drawingSlice.selectedIds),
  (selected) => { /* handle selection change */ }
));
```

## Styling

Tailwind CSS v4 is configured with a **terminal-like design system**.

### Design Principles

- **No border radius** - Everything is sharp/square
- **Monospace typography** - JetBrains Mono for UI, Gabriele for display
- **Minimal, rough aesthetic** - Terminal/IDE inspired

### CSS Variables

Located in `src/index.css`:

```css
/* Typography */
--font-mono: 'JetBrains Mono Variable', monospace;
--font-display: 'Gabriele', monospace;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;

/* Colors */
--bg-primary: #fafafa;      /* Main background */
--bg-secondary: #f5f5f5;    /* Sidebar, panels */
--bg-hover: #e5e5e5;        /* Hover state */
--bg-active: #d4d4d4;       /* Active/selected */

--text-primary: #171717;    /* Main text */
--text-secondary: #525252;  /* Secondary text */
--text-muted: #737373;      /* Muted/disabled */

--border-default: #d4d4d4;  /* Default borders */
--accent-danger: #dc2626;   /* Destructive actions */

/* Shadows (sharp, no blur radius) */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.15);
```

### Usage Examples

```tsx
// Use CSS variables with arbitrary values
function TerminalButton() {
  return (
    <button class="px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]">
      Click me
    </button>
  );
}

// Or use Tailwind equivalents
function SimpleButton() {
  return (
    <button class="px-3 py-2 bg-neutral-100 text-neutral-900 border border-neutral-300 hover:bg-neutral-200">
      Click me
    </button>
  );
}
```

### Kobalte Data Attributes

Style Kobalte components using data attributes:

```tsx
<DropdownMenu.Item
  class="px-3 py-2 data-[highlighted]:bg-[var(--bg-hover)] outline-none"
>
  Menu Item
</DropdownMenu.Item>

<DropdownMenu.Trigger
  class="opacity-0 group-hover:opacity-100 data-[expanded]:opacity-100"
>
  <MoreHorizontal size={14} />
</DropdownMenu.Trigger>
```

Common data attributes:
- `data-[highlighted]` - Item has focus/hover
- `data-[expanded]` - Menu/popover is open
- `data-[disabled]` - Element is disabled
- `data-[checked]` - Checkbox/radio is checked

## Performance Patterns

### Throttle vs Debounce

Use `@solid-primitives/scheduled` for rate-limiting frequent updates:

```ts
import { throttle, debounce } from "@solid-primitives/scheduled";
```

**Throttle** - Execute at most once per interval (rate limiting)
```
Events:    ●●●●●●●●●●●●●●●●●●●●
Throttle:  ●----●----●----●----  (every 100ms)
```

**Debounce** - Wait until events stop, then execute once
```
Events:    ●●●●●●●●●●----------●●●●----------
Debounce:  -------------------●-------------●  (100ms after last)
```

| Use Case | Technique | Why |
|----------|-----------|-----|
| Selection box drag | Throttle | Live feedback during interaction |
| Canvas pan/zoom | Throttle | Smooth updates while moving |
| Search input | Debounce | Wait until user stops typing |
| Window resize | Debounce | Only recalculate after resize ends |
| Scroll sync | Throttle | Regular updates during scroll |

**Example - Throttled store update:**
```ts
// Throttle store updates during drag (16ms ≈ 60fps)
private updateSelectedIds = throttle((ids: string[]) => {
  setStore('drawingSlice', 'selectedIds', ids)
}, 16)

// In event handler:
this.inputManager.onSelectionBox((event) => {
  // Visual update happens immediately (no lag)
  renderer.select()

  // Store update is throttled (prevents excessive renders)
  this.updateSelectedIds(selectedIds)
})
```

### Canvas/PixiJS Performance

See root `CLAUDE.md` for PixiJS-specific patterns (avoid binding React/Solid state to frequently-changing Konva/Pixi properties).

## Canvas Functional Architecture

The `canvas` feature is the core PixiJS canvas implementation.

### Canvas Class

```ts
// src/features/canvas/canvas.class.ts
export class Canvas {
  app: Application              // PixiJS application
  canvasId: string              // Active canvas ID
  topLayer: RenderLayer         // Selection UI, transform handles
  bottomLayer: RenderLayer      // Drawing shapes
  elements: Map<string, AElement>  // Element ID -> Renderable
  selectionArea: SelectionAreaRenderable      // Box selection visual
  multiTransformBox: MultiTransformBox        // Multi-select transform handles
  previewDrawing: AElement | null             // In-progress drawing

  static async create(params: TCanvasParams): Promise<Canvas>
  cleanup(): void
}
```

### Input Commands Pattern

Commands are functions that handle specific input interactions:

```ts
// src/features/canvas/input-commands/cmd.*.ts
export const cmdDrawNew: TCommand = {
  name: 'draw-new',
  canStart: (event, canvas) => {
    // Return true if this command should handle the event
    return store.toolbarSlice.activeTool !== 'select' && event.button === 0;
  },
  onStart: (event, context, canvas) => { /* Begin drawing */ },
  onMove: (event, context, canvas) => { /* Update preview */ },
  onEnd: (event, context, canvas) => { /* Finalize drawing */ },
  onCancel: (context, canvas) => { /* Cleanup on cancel */ },
};
```

**Available commands:**
- `cmd.draw-new.ts` - Create new shapes (rect, ellipse, diamond, etc.)
- `cmd.drag-shape.ts` - Drag individual shapes
- `cmd.drag-group.ts` - Drag multi-selected shapes
- `cmd.resize.ts` - Resize via transform handles
- `cmd.rotate.ts` - Rotate via transform handles
- `cmd.select-box.ts` - Box selection
- `cmd.select-shape.ts` - Click to select
- `cmd.select-delete.ts` - Delete selected shapes
- `cmd.pan.ts` - Pan canvas
- `cmd.zoom.ts` - Zoom canvas
- `cmd.tool-select.ts` - Keyboard shortcuts for tools

### Renderables Pattern

All canvas objects extend `ADrawingRenderable`:

```ts
// src/features/canvas/renderables/drawing.abstract.ts
export abstract class ADrawingRenderable {
  id: string
  container: Container
  backendDrawing: TBackendDrawing

  abstract updateFromBackend(drawing: TBackendDrawing): void
  abstract getHitArea(): Rectangle
  destroy(): void
}
```

**Shape renderables:**
- `RectRenderable` - Rectangle shapes
- `EllipseRenderable` - Ellipse shapes
- `DiamondRenderable` - Diamond shapes

### Store Sync

The `setup.store-sync.ts` watches for store changes and syncs to canvas:
- Creates/removes renderables when `backendDrawingsActive` changes
- Updates renderable positions/styles when drawings are modified
- Syncs selection state with `multiTransformBox`

## Path Aliases

Configure in `tsconfig.json` if needed:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
