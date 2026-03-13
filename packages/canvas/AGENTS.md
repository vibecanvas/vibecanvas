# Canvas Package Guide

This package is a small, self-contained canvas runtime built on top of Konva, SolidJS overlays, and Automerge document discovery.

The package is not a full scene editor yet. Its main job today is to boot a canvas surface, install behavior through plugins, and provide the structural pieces that future drawing/doc synchronization will plug into.

## What this package exports

- Entry point: `src/index.ts`
- Main public component: `src/components/Canvas.tsx`

Consumers render the `Canvas` component with:

- a backend `canvas` row that contains the Automerge URL
- a tiny UI store for sidebar visibility
- notification callbacks for loading failures

## Architecture First

The package is organized around four layers:

1. `Canvas.tsx` is the host and lifecycle bridge.
2. `CanvasService` is the runtime kernel.
3. Plugins attach behavior to the runtime through hooks.
4. Automerge is currently a document bootstrap dependency, not the rendering engine.

In practice, the flow looks like this:

```text
Canvas.tsx
  -> loads Automerge DocHandle from automerge_url
  -> creates CanvasService(container)
  -> CanvasService builds stage + layers + camera + hooks
  -> CanvasService installs plugins
  -> plugins listen to hooks and add behavior/UI
```

That separation is the most important design idea in this package:

- `Canvas.tsx` handles app-level mounting and async document loading.
- `CanvasService` owns the canvas runtime and shared state.
- plugins own features like event forwarding, camera control, grid rendering, and toolbar UI.
- the camera owns viewport math, not input policy.
- Automerge owns document lookup/persistence, but not canvas drawing logic yet.

## Main runtime pieces

### `src/components/Canvas.tsx`

This is the package host component.

- Reads `props.canvas.automerge_url`
- Resolves the Automerge document with `findDocument()`
- Creates a new `CanvasService` once the `DocHandle` is ready
- Destroys the previous service if the handle changes

Important detail: the component currently uses the doc handle as a readiness gate. The handle is not yet passed into `CanvasService` for scene rendering.

### `src/services/canvas/Canvas.service.ts`

This is the center of the package.

It creates and owns:

- the Konva `Stage`
- a `staticLayer`
- a `dynamicLayer`
- a `Camera` bound to the dynamic layer
- a shared plugin context
- lifecycle and interaction hooks

The runtime intentionally splits rendering into two layers:

- `staticLayer`: screen-space decorations that should not move like world content; currently used for the grid
- `dynamicLayer`: world content that pans/zooms with the camera; currently holds demo rectangles

That split is the core rendering architecture. Camera transforms are applied to the dynamic layer, while the grid is recomputed separately against the viewport.

## Plugin architecture

Plugins are defined by `src/plugins/interface.ts` and installed by `CanvasService`.

Each plugin receives an `IPluginContext` with:

- `stage`
- `staticLayer`
- `dynamicLayer`
- `camera`
- `hooks`
- small runtime API accessors like `getCanvasMode()` and `getTheme()`

The plugin system is modeled after a lightweight tapable-style architecture.

Hook implementations live in `src/tapable/`:

- `SyncHook`
- `AsyncParallelHook`
- `SyncExitHook`

This gives the runtime a clean extension model:

- `CanvasService` does not hardcode most behavior.
- Plugins subscribe to shared hook channels.
- Cross-plugin coordination happens through hooks/custom events instead of direct imports when possible.

## Event flow

`src/plugins/EventListener.plugin.ts` is the event bridge.

It listens to raw Konva stage events and republishes them into hook channels such as:

- `pointerDown`
- `pointerMove`
- `pointerUp`
- `pointerWheel`
- `keydown`
- `keyup`

Feature plugins then react to those hooks.

This means input flow is:

```text
DOM/Konva event
  -> EventListenerPlugin
  -> hook call on plugin context
  -> interested plugins react
```

That architecture keeps the stage wiring centralized while feature behavior stays modular.

## Camera and viewport model

`src/services/canvas/Camera.ts` owns viewport state:

- `x`
- `y`
- `zoom`

It provides two core operations:

- `pan(deltaX, deltaY)`
- `zoomAtScreenPoint(scale, point)`

The camera applies scale and position changes directly to the `dynamicLayer`.

This is a very important boundary:

- camera = viewport math + transform application
- camera control plugin = how wheel/gesture input should change the camera

`src/plugins/CameraControl.plugin.ts` turns wheel input into:

- ctrl/cmd-style zooming around the pointer
- regular panning from wheel deltas

After each update it emits `cameraChange`, which allows other plugins to redraw against the new viewport.

## Grid architecture

`src/plugins/Grid.plugin.ts` renders the background grid into the `staticLayer`.

It does not rely on stage transforms for the grid. Instead it:

- reads camera position and zoom
- calculates visible spacing in screen space
- rebuilds the grid lines for the current viewport

This makes the grid a derived viewport visualization rather than normal world geometry.

The plugin listens to:

- `cameraChange` to rerender during pan/zoom
- `customEvent` with `CustomEvents.GRID_VISIBLE` to show/hide the grid

## Toolbar architecture

`src/plugins/Toolbar.plugin.ts` is a plugin-owned DOM overlay.

Instead of drawing toolbar controls inside Konva, it mounts the Solid component from `src/components/FloatingCanvasToolbar/index.tsx` into an absolutely positioned DOM node attached to the stage container.

This is a useful pattern in this package:

- canvas visuals stay in Konva
- richer UI controls stay in Solid DOM

The toolbar currently manages:

- active tool state
- grid visibility state
- sidebar toggle action

Grid visibility is pushed back into the plugin ecosystem via `customEvent`, so UI state can influence canvas rendering without tightly coupling toolbar code to grid code.

## Automerge role today

`src/services/automerge.ts` owns the client-side Automerge repo setup.

It provides:

- singleton repo creation
- IndexedDB persistence
- WebSocket sync to `/automerge`
- cached handle lookup
- persisted document URL bookkeeping in `localStorage`
- helpers like `findDocument()` and `loadPersistedDocuments()`

Today, Automerge is used to locate and open the canvas document before startup.

Important limitation: `CanvasService` does not yet render from the Automerge document or write canvas edits back into it. The CRDT layer is present, but scene/state integration is still incomplete.

## Current package boundaries

What this package is good at right now:

- booting a Konva canvas runtime
- separating world rendering from viewport decorations
- composing behavior through plugins
- mounting DOM overlays beside canvas content
- connecting startup to an Automerge-backed canvas identifier

What is still early or incomplete:

- scene graph/data model integration with Automerge
- centralized input command system (`src/services/canvas/Canvas.input.ts` is empty)
- tool behaviors beyond basic camera/grid/toolbar scaffolding
- replacing demo rectangles with document-driven renderables

## Key files

- `src/index.ts` - package export surface
- `src/components/Canvas.tsx` - public host component and Automerge bootstrap
- `src/services/canvas/Canvas.service.ts` - runtime kernel
- `src/services/canvas/Camera.ts` - viewport math and transform application
- `src/services/automerge.ts` - Automerge repo/bootstrap layer
- `src/plugins/interface.ts` - plugin contract and shared context
- `src/plugins/EventListener.plugin.ts` - raw event to hook bridge
- `src/plugins/CameraControl.plugin.ts` - pan/zoom behavior
- `src/plugins/Grid.plugin.ts` - viewport-aware grid rendering
- `src/plugins/Toolbar.plugin.ts` - Solid toolbar overlay
- `src/custom-events.ts` - custom event names/payload types
- `src/tapable/*` - minimal hook implementation

## Mental model for future work

If you need to extend this package, keep these responsibilities separate:

- new runtime-wide shared capability -> add to `CanvasService` context
- new feature behavior -> add a plugin
- new viewport math -> extend `Camera`
- new overlay UI -> mount DOM/Solid from a plugin
- new doc-backed scene behavior -> connect Automerge handle/data into the runtime instead of bypassing the existing plugin/layer structure

The package is best understood as a plugin-driven canvas shell with Automerge-aware startup, not yet as a fully document-driven editor.
