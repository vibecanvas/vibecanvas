# Canvas Hosted Solid Widgets Plan

## Table of Contents

1. [Goal](#goal)
2. [Requirements](#requirements)
3. [Assumptions](#assumptions)
4. [What We Learned From Research](#what-we-learned-from-research)
5. [Current Problems](#current-problems)
6. [Target Architecture](#target-architecture)
7. [Hosted Widget Model](#hosted-widget-model)
8. [Single DOM Overlay Strategy](#single-dom-overlay-strategy)
9. [Render Order Strategy](#render-order-strategy)
10. [Interaction Model](#interaction-model)
11. [Plugin Plan](#plugin-plan)
12. [Hydration And CRDT Plan](#hydration-and-crdt-plan)
13. [App Boundary Plan](#app-boundary-plan)
14. [Detailed Implementation Tasks](#detailed-implementation-tasks)
15. [Key Changes Only](#key-changes-only)
16. [Testing Plan](#testing-plan)
17. [Risks And Edge Cases](#risks-and-edge-cases)
18. [CLAUDE.md / Docs Updates](#claudemd--docs-updates)
19. [File Changes](#file-changes)
20. [Progress / Research Notes](#progress--research-notes)
21. [ASCII Data Flow](#ascii-data-flow)

## Goal

Add a general hosted-widget plugin to `@vibecanvas/canvas` so the Konva runtime can host SolidJS components as real canvas elements.

The first supported hosted widget types should be:

- `chat`
- `filetree`
- `terminal`

The final design should:

- keep one simple Konva stage
- keep one DOM overlay root for all hosted Solid widgets
- keep selection, grouping, and transformer visuals in Konva `dynamicLayer`
- accept the tradeoff that DOM widget content sits above Konva content visually

## Requirements

1. One general plugin should host SolidJS widgets instead of building separate ad hoc widget systems.
2. Hosted widgets must still behave like normal canvas elements for:
   - selection
   - grouping
   - drag
   - resize
   - transform history
   - persisted render order
3. The visual widget content must be DOM/SolidJS, not redrawn inside Konva.
4. Selection / transformer / grouping visuals must stay in Konva `dynamicLayer`, not move into DOM.
5. There should be only one DOM overlay root for all hosted Solid components.
6. The transformer can be intentionally larger than the DOM content so handles remain visible outside the widget bounds.
7. Dragging that starts from widget UI must be communicated from SolidJS into the Konva runtime.
8. Mounting and cleanup of hosted Solid components must be explicit and reliable.
9. The design should fit the plugin/capability architecture already documented in `specs/spec.canvas.md`.

## Assumptions

1. This work targets `packages/canvas`, not the legacy Pixi runtime in `apps/spa/src/features/canvas-crdt`.
2. The runtime should stay simple:
   - one `Konva.Stage`
   - one `worldWidgetsRoot` DOM layer mounted into `stage.container()`
   - no multi-stage or split-canvas architecture
3. Hosted widgets should use an invisible `Konva.Rect` as the canonical scene node.
4. The invisible host rect is the source of truth for:
   - world position
   - world size
   - rotation
   - parent group membership
   - `zIndex`
5. The DOM widget should mirror host-rect bounds in screen space.
6. We accept that DOM widget content cannot be visually interleaved between Konva layers in one stage.
7. We accept that hosted widgets visually sit above normal Konva world content.
8. We accept that Konva transformer visuals may overlap only around the outside perimeter of the DOM widget, not through the middle of it.
9. Initial implementation can prioritize hydration and runtime hosting first; creation helpers can be added in the same pass if the app boundary is straightforward.

## What We Learned From Research

### Canvas package findings

1. `packages/canvas` already has the right overall architecture for this work:
   - thin `Canvas.tsx`
   - shared `CanvasService`
   - plugin-owned behavior
   - capability-based shape/group boundaries
2. `CanvasService` already creates three intentional Konva layers:
   - `staticBackgroundLayer`
   - `staticForegroundLayer`
   - `dynamicLayer`
3. `packages/canvas` already mounts screen-space Solid overlays directly into `stage.container()` in plugins such as:
   - `ToolbarPlugin`
   - `HelpPlugin`
   - `RecorderPlugin`
   - `SelectionStyleMenuPlugin`
   - `ContextMenuPlugin`
4. `RenderOrderPlugin` already provides a durable persisted ordering model using string `zIndex` tokens and node attrs.
5. `SceneHydratorPlugin` already hydrates document entities by asking capability hooks to create scene nodes.
6. `GroupPlugin`, `SelectPlugin`, and `TransformPlugin` already expect real Konva nodes for selection and grouping flows.

### Shared document model findings

1. The shared canvas doc already has widget element types in `packages/imperative-shell/src/automerge/types/canvas-doc.ts`:
   - `chat`
   - `filetree`
   - `terminal`
2. Those element types already carry width and height in document data.
3. That means the hosted-widget plugin does not need a schema invention step for the initial widget types.

### SPA research findings

1. The legacy SPA already uses the exact broad pattern we want:
   - a real canvas/renderable object for transform/select behavior
   - a DOM overlay root for rich widget UI
   - screen-space bounds synced from world-space canvas state
2. Existing legacy widget classes for `chat`, `filetree`, and `terminal` already proved these concepts:
   - mount Solid UI into one shared DOM entrypoint
   - sync bounds on viewport change
   - forward drag intent from widget header UI into canvas movement logic
3. The old SPA also revealed the main render-order limitation:
   - DOM overlays sit above the canvas visually
   - DOM-vs-canvas interleaving is not truly available in a simple single-stage architecture

### Architectural conclusion from research and discussion

The correct first implementation is the simple one:

- keep one Konva stage
- keep one DOM overlay root for hosted widgets
- keep transformer / selection / grouping visuals in Konva `dynamicLayer`
- accept DOM-above-canvas tradeoffs
- make the transformer intentionally larger than the hosted DOM widget bounds so handles remain usable

## Current Problems

### 1. Widget types exist in the document but not in the package runtime

- `chat`, `filetree`, and `terminal` are present in the shared document model
- `packages/canvas` does not currently know how to hydrate or render them

### 2. Existing shape capability flow assumes pure Konva shapes

- current plugins support shapes such as rects, text, pen, and image
- there is no generic hosted-widget capability path yet

### 3. There is no package-level world DOM overlay root for document-backed widgets

- existing overlay plugins mount screen-space controls
- no package-level plugin currently mounts document-backed world widgets tied to scene nodes

### 4. Drag intent from rich widget UI has no canonical bridge into Konva yet

- pointer interaction on a DOM widget does not automatically become a Konva drag
- a dedicated bridge is needed from Solid widget surfaces into the host rect / Konva runtime

### 5. Render order must be mirrored into DOM as well as Konva

- Konva runtime order already exists for scene nodes
- hosted DOM widgets need the same persisted ordering token reflected into CSS ordering to stay consistent with CRDT state

## Target Architecture

Create one new plugin, tentatively named:

- `HostedSolidWidgetPlugin`

That plugin owns all document-backed Solid widget hosting in `packages/canvas`.

### Core design

1. Each hosted widget is represented in Konva by an invisible host rect in `staticForegroundLayer`.
2. The host rect participates in all normal canvas behaviors:
   - selection
   - grouping
   - transform
   - render order
   - history
3. The hosted widget's actual UI is mounted into one shared DOM root:
   - `worldWidgetsRoot`
4. The widget DOM element mirrors the host rect's world bounds in screen coordinates.
5. `dynamicLayer` remains the only place for transformer / selection / group visuals.
6. Dragging that begins from DOM widget chrome is forwarded into the Konva host rect / scene node logic.

### Responsibility split

#### `Canvas.tsx`
- stays thin
- optionally receives app-provided widget renderers/services
- passes those capabilities into `CanvasService`

#### `CanvasService`
- creates and exposes the shared `worldWidgetsRoot`
- threads widget capabilities into plugin context
- installs the new hosted-widget plugin before hydration

#### `HostedSolidWidgetPlugin`
- owns widget host rect creation
- owns widget DOM mount/update/destroy
- owns widget adapter registry
- owns world-to-screen bounds sync
- owns drag bridge from DOM into Konva
- owns widget-specific capability overrides for:
  - `createShapeFromTElement`
  - `updateShapeFromTElement`
  - `toElement`

#### Existing shared plugins
- `SceneHydratorPlugin` continues to hydrate through capability hooks
- `RenderOrderPlugin` remains canonical for persisted order
- `SelectPlugin`, `TransformPlugin`, and `GroupPlugin` continue to operate on Konva nodes
- they should only need small compatibility adjustments, not a rewrite

## Hosted Widget Model

### Canonical node choice

Use an invisible `Konva.Rect` as the canonical node for each hosted widget.

### Why rect is the right default

1. It already fits current transform flows.
2. It already fits current shape selection flows.
3. It already fits grouping logic.
4. It already fits render-order logic because the runtime already handles `Konva.Shape` nodes cleanly.
5. It avoids introducing a second transform/selection model just for widgets.

### Required host rect attrs

Suggested attrs on the host rect:

- `id`
- `name` such as `hosted-widget`
- `vcWidgetType`
- `vcHosted = true`
- existing persisted `vcZIndex`

The host rect should be:

- visually transparent
- still selectable/listening
- transformable like a normal scene item

### Widget adapter model

The general plugin should not hardcode chat/filetree/terminal rendering inline.

Instead it should register adapters keyed by `TElement.data.type`.

Suggested conceptual shape:

```ts
type THostedWidgetAdapter = {
  type: "chat" | "filetree" | "terminal"
  mount(args: THostedWidgetMountArgs): () => void
  syncProps?(args: THostedWidgetSyncArgs): void
}
```

Where the mount args include:

- `mountElement`
- `element`
- `bounds`
- widget-specific ids / app services if needed
- drag callbacks that communicate back into canvas logic

## Single DOM Overlay Strategy

Add one DOM root inside `stage.container()`:

- `worldWidgetsRoot`

### Structure

```text
stage.container()
├─ Konva canvas
│  ├─ staticBackgroundLayer
│  ├─ staticForegroundLayer
│  └─ dynamicLayer
└─ worldWidgetsRoot
   ├─ widget:chat:abc
   ├─ widget:filetree:def
   └─ widget:terminal:ghi
```

### DOM root behavior

- absolute positioned
- inset `0`
- `pointer-events: none` on the root
- each widget mount uses `pointer-events: auto`

### Widget bounds sync

For each hosted widget:

1. read host rect world position/size/rotation
2. convert to screen-space using current stage/camera transform
3. update widget DOM element style only when bounds changed materially

Sync should run on:

- camera changes
- canvas resize
- host rect drag move
- host rect transform
- render order changes if DOM stacking is mirrored through `z-index`

## Render Order Strategy

Render order should stay canonical in the existing `RenderOrderPlugin`.

### Source of truth

- CRDT `element.zIndex`
- mirrored into Konva node attr `vcZIndex`
- mirrored into hosted DOM stacking order inside `worldWidgetsRoot`

### What this gives us

1. persisted order survives reload/hydration
2. Konva host rect order stays correct
3. hosted widgets remain ordered relative to each other consistently

### Accepted limitation

Hosted DOM widgets cannot be visually inserted between Konva layers in a single-stage architecture.

So the visual stack is:

```text
bottom
  staticBackgroundLayer
  staticForegroundLayer content
  dynamicLayer controls
  worldWidgetsRoot DOM widgets
top
```

Discussion decision for this plan:

- keep the simple architecture
- accept the tradeoff
- make transformer bounds larger than the widget DOM so resize handles can remain visible outside the widget box

### Recommendation for transformer sizing

When a hosted widget is selected, the transformer frame should target a padded box larger than the DOM widget by a fixed world-space or screen-space margin.

That gives:

- visible handles around the outside
- no need to move controls into DOM
- no multi-stage architecture

## Interaction Model

### Selection

- click on host rect through canvas should select normally
- click inside widget DOM should also be able to request selection if needed
- selection state remains runtime-local in Konva as it is today

### Resize / transform

- still owned by existing `TransformPlugin`
- host rect is the transform target
- DOM widget just mirrors bounds

### Grouping

- still owned by `GroupPlugin`
- hosted widgets group through their host rects
- group boundaries stay in `dynamicLayer`

### Dragging

Dragging is the one interaction that must be communicated from SolidJS into Konva.

That means each hosted widget adapter should expose explicit drag affordances, usually from a header area.

Recommended flow:

1. widget header `pointerdown`
2. widget adapter calls hosted-plugin bridge
3. bridge selects host rect if needed
4. bridge starts a canvas drag flow on the Konva host rect, or forwards deltas into the same movement path used by shape dragging
5. host rect moves in world space
6. DOM widget bounds update from host rect movement

Important first-version rule:

- only drag needs to be bridged from SolidJS into Konva
- resize and selection visuals stay owned by Konva-side plugins

## Plugin Plan

## New plugin

Add:

- `packages/canvas/src/plugins/HostedSolidWidget.plugin.ts`

Register it before `SceneHydratorPlugin` so hydration can use it.

Recommended placement area:

1. `Shape2dPlugin`
2. `PenPlugin`
3. `TextPlugin`
4. `ImagePlugin`
5. `HostedSolidWidgetPlugin`
6. `GroupPlugin`
7. `ContextMenuPlugin`
8. `SceneHydratorPlugin`

Exact final ordering can shift, but hosted-widget capability registration must happen before hydration.

## Plugin context extension

`packages/canvas/src/plugins/interface.ts` should grow hosted-widget capabilities.

Suggested direction:

```ts
capabilities: {
  // existing capabilities...
  hostedWidgets?: {
    root: HTMLDivElement
    isHostedNode(node: Konva.Node): boolean
    getWidgetType(node: Konva.Node): "chat" | "filetree" | "terminal" | null
    syncNode(node: Konva.Shape): void
    removeNode(id: string): void
  }
}
```

Exact naming can vary, but the important point is:

- plugin-owned
- reusable from transform/group/render-order integration points
- not hidden in internal module state only

## Capability registration strategy

`HostedSolidWidgetPlugin` should wrap the shared shape capability hooks.

### `createShapeFromTElement`

- intercept `chat`, `filetree`, `terminal`
- create invisible host rect
- set attrs and listeners
- register/mount widget DOM entry
- return rect

### `updateShapeFromTElement`

- find existing host rect by id
- sync world attrs from document data
- sync DOM widget bounds and any widget props
- preserve existing `zIndex`

### `toElement`

- serialize host rect back into the corresponding widget `TElement`
- preserve widget-specific document data that is not geometry

## Hydration And CRDT Plan

### Hydration

No `SceneHydratorPlugin` rewrite should be needed.

Once the hosted-widget plugin registers capability handlers, hydration should already work via the existing path:

1. `SceneHydratorPlugin` iterates document elements
2. hosted widget type reaches `createShapeFromTElement`
3. hosted-widget plugin creates host rect + DOM widget mount
4. hydrator inserts the host rect into `staticForegroundLayer` or a parent group
5. render-order plugin reapplies persisted order

### CRDT writes

CRDT remains the same package boundary.

All geometry writes should continue to go through:

- `context.crdt.patch()`
- `context.crdt.deleteById()`

The host rect is the geometry serialization source.

### Persisted widget data

The hosted-widget plugin should preserve widget-specific document data on serialize.

Examples:

- `chat.isCollapsed`
- `filetree.globPattern`
- `terminal.workingDirectory`

The hosted-widget plugin should not accidentally wipe non-geometry widget data during drag/transform serialization.

## App Boundary Plan

The package should stay reusable and avoid importing app-local widget code directly.

### Recommended package-facing boundary

Allow `Canvas` / `CanvasService` to receive a hosted-widget renderer registry from the consuming app.

Conceptually:

```ts
type THostedWidgetRendererRegistry = {
  chat?: THostedWidgetRenderer
  filetree?: THostedWidgetRenderer
  terminal?: THostedWidgetRenderer
}
```

This keeps:

- package runtime generic
- app-specific data fetching in the app layer
- no hard import from `apps/spa` into `packages/canvas`

### First-pass simplification

If the consumer wiring is not ready yet, implementation can ship in two layers:

1. package plugin + registry API
2. app-provided chat/filetree/terminal renderers wired afterward

That still gives the correct architecture on day one.

## Detailed Implementation Tasks

## 1. Extend shared runtime context

- [x] update `packages/canvas/src/plugins/interface.ts`
  - [x] add hosted-widget capability types
  - [x] add access to the shared widget DOM root
- [x] update `packages/canvas/src/services/canvas/Canvas.service.ts`
  - [x] create `worldWidgetsRoot`
  - [x] append it to `stage.container()`
  - [x] clean it up on destroy
  - [x] thread app-provided widget renderer registry into plugin context

## 2. Add hosted-widget infrastructure plugin

- [x] create `packages/canvas/src/plugins/HostedSolidWidget.plugin.tsx`
- [x] register it in `packages/canvas/src/plugins/index.ts`
- [x] install it in `defaultPlugins()` before `SceneHydratorPlugin`

## 3. Add hosted-widget helper modules

- [ ] create helper modules for:
  - [ ] widget adapter types
  - [ ] bounds/world-to-screen conversion
  - [ ] DOM mount bookkeeping
  - [ ] host-node detection helpers

Possible files:

- `packages/canvas/src/plugins/hosted-widget/types.ts`
- `packages/canvas/src/plugins/hosted-widget/bounds.ts`
- `packages/canvas/src/plugins/hosted-widget/registry.ts`
- `packages/canvas/src/plugins/hosted-widget/dom.ts`

Implementation note:

- deferred for now; the first landed version keeps these helpers inline inside `HostedSolidWidget.plugin.tsx` to reduce integration churn while the architecture settles

## 4. Implement generic host rect lifecycle

- [x] create invisible host rect for `chat`
- [x] create invisible host rect for `filetree`
- [x] create invisible host rect for `terminal`
- [x] set attrs for widget type and hosted-node detection
- [x] ensure host rect is listening/selectable
- [x] ensure render-order token is preserved on node attrs

## 5. Implement DOM widget mount lifecycle

- [x] create one widget DOM element per hosted element id
- [x] mount Solid renderer into that element
- [ ] pass screen-space bounds as reactive props
- [x] update bounds on camera/resize/drag/transform
- [x] dispose Solid render on node destroy
- [x] remove DOM mount entry on delete/destroy

Implementation note:

- current version applies bounds directly to the mount element style instead of exposing bounds as a reactive renderer prop

## 6. Implement drag bridge from Solid to Konva

- [x] define a plugin API that widget components can call on header pointerdown/move/up
- [x] select the host rect before drag if needed
- [x] forward drag movement into existing canvas movement flow
- [x] keep DOM movement visually smooth by updating from host rect changes
- [x] commit final geometry through existing CRDT/history paths

## 7. Keep Konva controls as-is, with hosted compatibility

- [x] avoid moving any controls into DOM
- [x] ensure hosted-node selection still drives one shared transformer
- [x] keep compatibility without touching `TransformPlugin` by rendering widget DOM inset inside the host rect bounds
- [x] keep `GroupPlugin` / Konva controls unchanged in the first pass

## 8. Render-order integration

- [x] mirror persisted order into DOM widget stacking order inside `worldWidgetsRoot`
- [x] update DOM ordering when `RenderOrderPlugin` changes node order
- [x] ensure hydration order and live reorder actions keep widget DOM stacking stable

## 9. App integration

- [x] extend `packages/canvas/src/components/Canvas.tsx` with widget renderer registry prop or equivalent
- [ ] wire the package consumer to provide `chat`, `filetree`, and `terminal` Solid renderers
- [x] keep app-specific fetch/resource logic in the app layer, not in the package runtime

Implementation note:

- the package now supports app-provided widget renderers, but the current shipped path still falls back to package-local placeholder widget bodies until real app renderers are wired

## 10. Tests

- [x] add focused hosted-widget plugin tests
- [x] add hydration coverage for `chat`, `filetree`, and `terminal`
- [ ] add bounds-sync coverage for camera and resize changes
- [x] add cleanup coverage for DOM unmount on node destroy
- [x] add drag-bridge coverage from DOM events into host rect movement
- [x] add render-order mirroring coverage for hosted DOM order

## Key Changes Only

This section intentionally shows only the important architectural changes, not full code.

### 1. One new package-level plugin

```ts
export class HostedSolidWidgetPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    // register create/update/toElement handlers
    // create/mount one DOM node per hosted widget
    // sync screen-space bounds from host rect world geometry
    // bridge drag intent from Solid widget header into Konva movement
  }
}
```

### 2. One shared DOM root for document-backed widgets

```text
stage.container()
├─ Konva canvas
└─ worldWidgetsRoot
```

### 3. Hosted widgets use invisible host rects

```ts
type THostedWidgetNode = Konva.Rect
```

This preserves compatibility with existing selection/group/transform flows.

### 4. Controls remain in Konva

There is no separate DOM controls layer in this plan.

- transformer stays in `dynamicLayer`
- group boundary stays in `dynamicLayer`
- selection UI stays in `dynamicLayer`

The implementation kept this exactly as planned.

Instead of changing transformer math, the DOM content is inset inside the host rect so Konva handles can remain visible around the outside.

### 5. Drag is the explicit DOM-to-Kanvas bridge

The package does not need to move all interactions into DOM. It only needs a clean bridge for drag gestures that begin on widget UI.

## Testing Plan

## Focused tests to add

### Hydration

- [ ] hydrates `chat` into host rect + DOM widget mount
- [ ] hydrates `filetree` into host rect + DOM widget mount
- [ ] hydrates `terminal` into host rect + DOM widget mount
- [ ] mounts hosted widgets inside parent groups when `parentGroupId` is set

### Bounds sync

- [ ] widget DOM updates on camera pan
- [ ] widget DOM updates on camera zoom
- [ ] widget DOM updates on stage resize
- [ ] widget DOM updates on host rect transform

### Selection / transform compatibility

- [ ] hosted widget can be selected through its host rect
- [ ] hosted widget can join multi-selection with regular shapes
- [ ] hosted widget can be grouped
- [ ] hosted widget uses padded transformer bounds so handles remain visible

### Drag bridge

- [ ] header drag in widget DOM moves host rect in world space
- [ ] drag end writes updated geometry to CRDT
- [ ] drag history undo restores previous position

### Render order

- [ ] hosted DOM `z-index` mirrors persisted `zIndex`
- [ ] bring forward / send back updates both Konva host rect order and DOM widget stacking
- [ ] mixed hosted-widget siblings preserve order across reload/hydration

### Cleanup

- [ ] deleting a hosted widget removes its DOM mount
- [ ] destroying the canvas removes `worldWidgetsRoot`
- [ ] host rect destroy disposes Solid renderer exactly once

## Risks And Edge Cases

## 1. Konva controls can still be partially obscured by DOM widget content

Risk:

- DOM sits above the stage visually

Accepted mitigation:

- keep the architecture simple
- pad transformer bounds larger than widget DOM bounds

## 2. Dragging from deep interactive widget content may conflict with widget UX

Risk:

- selecting text, scrolling, or clicking inputs should not start canvas drag

Recommendation:

- restrict drag bridge to explicit widget drag surfaces such as headers or drag handles

## 3. Widget serializers may accidentally wipe app-owned state

Risk:

- geometry serialization could overwrite `globPattern`, `workingDirectory`, or collapse flags

Recommendation:

- hosted-widget serializer should preserve non-geometry widget data unless the widget intentionally changed it

## 4. Screen-space sync churn

Risk:

- too many DOM style writes during drag/zoom

Recommendation:

- cache last bounds and update only on meaningful change

## 5. App/package boundary drift

Risk:

- package tries to import app-local widget implementations directly

Recommendation:

- make widget rendering app-provided through a registry/capability boundary

## CLAUDE.md / Docs Updates

Closest guidance already lives in:

- `packages/canvas/AGENTS.md`
- `specs/spec.canvas.md`

For planning only, no docs update is required yet.

If implementation lands, recommended updates are:

1. update `specs/spec.canvas.md` plugin list to include hosted-widget support
2. update the layer/runtime section to mention `worldWidgetsRoot`
3. update current gaps to remove the lack of document-backed hosted widgets once the feature ships

## File Changes

## New files

- `packages/canvas/src/plugins/HostedSolidWidget.plugin.tsx`
- `packages/canvas/tests/plugins/hosted-widget/HostedSolidWidgetPlugin.test.ts`
- `apps/frontend/src/feature/terminal/context/terminal.context.tsx`
- `apps/frontend/src/feature/terminal/components/terminal-widget.tsx`
- `apps/frontend/src/feature/terminal/components/terminal-hosted-widget.tsx`

## Modified files

- `packages/canvas/src/services/canvas/interface.ts`
- `packages/canvas/src/plugins/interface.ts`
- `packages/canvas/src/services/canvas/Canvas.service.ts`
- `packages/canvas/src/plugins/index.ts`
- `packages/canvas/src/plugins/RenderOrder.plugin.ts`
- `packages/canvas/src/components/Canvas.tsx`
- `packages/canvas/tests/test-setup.ts`
- `apps/frontend/package.json`
- `apps/frontend/src/pages/canvas.tsx`

## Possibly modified files

- `packages/canvas/src/custom-events.ts` if a hosted-widget drag custom event becomes useful
- `packages/canvas/src/plugins/Select.plugin.ts` if hosted-node hit behavior needs a small compatibility patch
- package consumer files that provide real `chat`, `filetree`, and `terminal` renderers

## Progress / Research Notes

### Completed research in this planning session

1. Read `specs/spec.canvas.md` to align the plan with the current Konva package architecture.
2. Inspected `packages/canvas/src/services/canvas/Canvas.service.ts` to confirm existing layer creation and plugin ordering.
3. Inspected `packages/canvas/src/plugins/interface.ts` to confirm current plugin context capability boundaries.
4. Inspected `packages/canvas/src/plugins/SceneHydrator.plugin.ts`, `Text.plugin.ts`, `Group.plugin.ts`, and `RenderOrder.plugin.ts` to understand hydration, grouping, transform, and persisted ordering expectations.
5. Confirmed the shared document model already contains `chat`, `filetree`, and `terminal` element data types in `packages/imperative-shell/src/automerge/types/canvas-doc.ts`.
6. Inspected the old SPA overlay-entrypoint pattern in `apps/spa/src/App.tsx`.
7. Inspected the old filetree widget renderable in `apps/spa/src/features/canvas-crdt/renderables/elements/filetree/filetree.class.ts` and related SPA widget architecture via repo exploration.
8. Confirmed the old SPA pattern already used:
   - one shared overlay root
   - DOM widget mounts per element
   - world-to-screen bounds sync
   - explicit drag callbacks from widget UI back into canvas logic

### Architectural decisions from discussion

1. Do not split the runtime into multiple stages/canvases.
2. Do not add a second DOM controls layer.
3. Keep controls rendered the old way in Konva `dynamicLayer`.
4. Add only one DOM layer for hosted SolidJS widget content.
5. Accept the visual tradeoff that DOM widgets sit above the Konva stage.
6. Make the transformer bounds larger than the widget DOM so handles remain visible.
7. Treat drag as the only interaction that must be explicitly bridged from SolidJS into Konva.

### Implementation note for later

When code lands, this section should be updated with:

- exact capability names chosen
- final file names created
- any deviations from the renderer-registry boundary
- test commands run and results

### Implementation notes after landing code

1. Added `HostedSolidWidgetPlugin` at `packages/canvas/src/plugins/HostedSolidWidget.plugin.tsx`.
2. Added `worldWidgetsRoot` in `packages/canvas/src/services/canvas/Canvas.service.ts` and exposed it on plugin context.
3. Extended package-facing widget types in `packages/canvas/src/services/canvas/interface.ts` with:
   - `THostedWidgetType`
   - `THostedWidgetElementMap`
   - `THostedWidgetRenderers`
4. Extended `Canvas` props in `packages/canvas/src/components/Canvas.tsx` with an optional `widgets.renderers` registry.
5. Added hosted-widget capability hooks on plugin context:
   - `isHostedNode(...)`
   - `syncNode(...)`
   - `removeNode(...)`
   - `syncDomOrder(...)`
6. Implemented host rect hydration/serialization for `chat`, `filetree`, and `terminal` using invisible `Konva.Rect` nodes with persisted widget snapshots stored on node attrs.
7. Implemented package-local fallback widget shells and placeholder bodies so the plugin works immediately even without app-provided renderers.
8. Kept controls entirely in Konva. No new DOM controls layer was added.
9. Avoided `TransformPlugin` changes by rendering widget DOM inset inside the host rect; that makes the transformer naturally larger than the visible DOM body.
10. Implemented DOM header drag bridging back into Konva world movement with CRDT patch + history recording on drag end.
11. Updated `RenderOrderPlugin` to trigger hosted DOM reordering after sort/apply operations.
12. Added focused tests in `packages/canvas/tests/plugins/hosted-widget/HostedSolidWidgetPlugin.test.ts` covering:
    - hydration
    - DOM mount creation
    - header drag bridge
    - DOM ordering
    - cleanup on destroy
13. Follow-up terminal integration reuses the legacy SPA terminal split instead of moving backend/runtime logic into the Konva plugin:
    - Konva/plugin owns host rect, overlay mount, bounds sync, and drag bridge
    - Solid terminal component owns Ghostty/PTy mount and cleanup via `onCleanup(...)`
14. Added frontend terminal components copied/adapted from the legacy SPA flow:
    - `apps/frontend/src/feature/terminal/context/terminal.context.tsx`
    - `apps/frontend/src/feature/terminal/components/terminal-widget.tsx`
    - `apps/frontend/src/feature/terminal/components/terminal-hosted-widget.tsx`
15. Wired the real terminal renderer into `Canvas` from `apps/frontend/src/pages/canvas.tsx` through the hosted-widget renderer registry.
16. No backend API changes were required for the terminal follow-up; existing PTY create/get/update/remove and websocket connect flows are reused as-is.
17. Follow-up UX changes for hosted terminal/widgets:
    - terminal header now uses a darker readable background
    - removed the fake red/orange/green window buttons
    - added a single close button in the top-right corner
    - terminal header label now uses a neutral placeholder (`untitled`) instead of repeating `terminal`
    - hosted widget DOM now uses CSS matrix transforms from Konva absolute transforms so widget content scales with zoom instead of staying screen-fixed
    - hosted single-selection transformer is hidden by default and only shown after double-clicking the widget header
    - keyboard shortcuts are ignored when focus is inside a hosted widget DOM subtree so terminal typing no longer triggers toolbar shortcuts
18. Additional terminal/header/help refinements:
    - removed explicit "double click" helper text from the terminal header
    - added a dedicated resize button beside the close button to reveal the transformer on demand
    - extended help content with a new `Hosted Terminal` section documenting typing, moving, resizing, closing, and zoom behavior
19. Regression fixes after real usage feedback:
    - deleting a hosted terminal now explicitly unmounts the widget DOM before destroying the Konva host node, which fixes the stale DOM case seen from the close button flow
    - hosted renderers can now register a `beforeRemove` callback; the real terminal renderer uses that to call terminal cleanup / PTY removal before the canvas node is deleted
    - hosted widget resize now bakes node scale back into width/height and resets scale/skew on the Konva host rect, preventing skewed or oversized terminal content after resize
    - hosted DOM transform now separates canvas zoom scaling from widget resize sizing, so zoom still scales terminal text while resize adjusts layout dimensions instead of visually skewing the terminal
20. Hosted drag speed regression fix:
    - added a regression test proving hosted widget drag matches pointer world-space movement under both zoom-in and zoom-out camera states
    - replaced DOM drag delta math with pointer-anchored world-space movement using `getWorldPosition(...)` / `setWorldPosition(...)`
    - corrected drag math to work in layer/world coordinates instead of Konva absolute screen coordinates, which removes the "faster on zoom-out / slower on zoom-in" feel for all hosted widgets at the plugin level
21. Hosted drag CRDT streaming:
    - hosted widget drag now streams throttled CRDT patch updates during drag, matching the image plugin behavior more closely
    - added a regression test that proves document state updates before `pointerup`, rather than only at drag end
    - the throttling lives in `HostedSolidWidgetPlugin`, so future hosted widgets inherit the same streaming behavior automatically
22. Terminal ownership was moved fully into `@vibecanvas/canvas`:
    - removed the host-driven `widgets.renderers` / `widgetRenderers` boundary
    - `Canvas` now accepts `terminal.safeClient` instead of hosted renderer components
    - `HostedSolidWidgetPlugin` now renders the package-owned terminal body directly for `terminal` widgets
23. New package terminal runtime files were added under `packages/canvas/src/components/terminal/`:
    - `GhosttyTerminalMount.tsx` owns Ghostty init/open/dispose via `onMount(...)` / `onCleanup(...)`
    - `createTerminalContextLogic.ts` owns PTY/session lifecycle and websocket wiring
    - `TerminalWidget.tsx` is the reusable package terminal UI
    - `TerminalHostedWidget.tsx` is the hosted-widget body used by `HostedSolidWidgetPlugin`
24. PTY helpers/service were moved into `packages/canvas/src/services/terminal/opencode-pty.ts`:
    - websocket URL builder
    - cursor extraction helpers
    - terminal session localStorage helpers
    - `createOpencodePtyService(safeClient)` factory built around injected host `safeClient`
25. Host apps now only provide transport/client access:
    - `apps/frontend/src/pages/canvas.tsx` passes `terminal={{ safeClient: orpcWebsocketService.safeClient }}`
    - `apps/spa/src/pages/session/terminal-panel.tsx` and `apps/spa/src/features/terminal/components/terminal-canvas-widget.tsx` now consume the package `TerminalWidget`
26. Legacy duplicated terminal implementations were removed from `apps/frontend` and `apps/spa`:
    - old terminal context/widget wrappers
    - duplicated `opencode-pty.ts` services and tests
27. Dependency ownership changed:
    - `ghostty-web` moved from app package manifests into `packages/canvas/package.json`
    - `apps/spa/package.json` now explicitly depends on `@vibecanvas/canvas` because it imports the package terminal widget directly
28. Tests were updated for the new boundary:
    - added `packages/canvas/tests/services/terminal/opencode-pty.test.ts`
    - updated `HostedSolidWidgetPlugin.test.ts` to mock Ghostty/WebSocket, inject `terminal.safeClient`, and assert the package-owned cleanup path
29. Important runtime note learned during implementation:
    - once the terminal body lives inside the package, `ghostty-web` must be resolvable for the whole canvas test/build graph because `HostedSolidWidgetPlugin` imports the package terminal component at module load time
30. Follow-up scope correction:
    - reverted all `apps/spa` edits because that app is legacy and out of scope for this change
    - final ownership for this task is only `packages/canvas` + `apps/frontend`
    - any standalone/legacy SPA terminal surfaces continue using their original codepaths and were intentionally left untouched

### Verification completed

Commands run:

```bash
bun install
bun --filter @vibecanvas/canvas test tests/services/terminal/opencode-pty.test.ts tests/plugins/hosted-widget/HostedSolidWidgetPlugin.test.ts
bun --filter @vibecanvas/canvas test
bun --filter @vibecanvas/frontend build
```

Results:

- targeted terminal tests pass: `2` files, `16` tests
- full canvas suite passes: `26` files, `160` tests
- frontend production build passes after removing host-owned Ghostty widget rendering
- all `apps/spa` changes were reverted afterward to keep the final scope limited to `packages/canvas` and `apps/frontend`

## ASCII Data Flow

```text
Automerge TElement
(chat | filetree | terminal)
        |
        v
SceneHydratorPlugin
        |
        v
HostedSolidWidgetPlugin
        |
        +-----------------------------------+
        |                                   |
        v                                   v
 invisible Konva.Rect                 DOM widget mount
 staticForegroundLayer                worldWidgetsRoot
        |                                   |
        | selected / grouped / transformed  | Solid component render
        | by existing canvas plugins        | screen-space bounds
        v                                   v
SelectPlugin / GroupPlugin /          chat / filetree / terminal UI
TransformPlugin
        |
        v
dynamicLayer transformer + boundaries


Drag from widget header:

Solid widget header pointerdown/move/up
        |
        v
HostedSolidWidgetPlugin drag bridge
        |
        v
move host rect in Konva world space
        |
        +-------------------+
        |                   |
        v                   v
update DOM bounds      serialize geometry
from host rect         via toElement(hostRect)
                            |
                            v
                     context.crdt.patch(...)
```

## List of File Changes

- add one generic `HostedSolidWidgetPlugin`
- add one shared `worldWidgetsRoot` DOM overlay inside `stage.container()`
- represent hosted widgets with invisible host rects in `staticForegroundLayer`
- keep transformer and grouping visuals in Konva `dynamicLayer`
- add widget adapter/registry helpers for `chat`, `filetree`, and `terminal`
- bridge drag from Solid widget surfaces into existing Konva movement logic
- mirror persisted `zIndex` into DOM widget stacking
