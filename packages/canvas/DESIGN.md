# Canvas design

## Services

- [x] `render` - stage, layers, low-level engine refs, resize hook
- [x] `camera` - x/y/zoom, pan/zoom ops, change hook
- [x] `editor` - tool registry, active tool, editing state, previews, transform refs, and node<->element registries
- [x] `selection` - mode, selection, focused id
- [x] `theme` - current theme
- [x] `history`
- [x] `crdt`
- [ ] `canvasDocument`
- [ ] `renderOrder`
- [ ] `hostedWidgets`
- [ ] `shapeRegistry`
- [ ] `groupRegistry`
- [ ] `notification`
- [ ] `image`
- [ ] `filetree`
- [ ] `file`
- [ ] `terminal`

## Plugins

- [x] `EventListenerPlugin`
- [x] `GridPlugin`
- [x] `CameraControlPlugin`
- [x] `ToolbarPlugin`
- [x] `VisualDebugPlugin`
- [x] `HistoryControlPlugin`
- [ ] `SelectionStyleMenuPlugin`
- [ ] `HelpPlugin`
- [ ] `RecorderPlugin` (`DEV` only)
- [ ] `RenderOrderPlugin`
- [x] `SelectPlugin`
- [x] `TransformPlugin`
- [ ] `Shape1dPlugin`
- [ ] `Shape2dPlugin`
- [ ] `PenPlugin`
- [x] `TextPlugin` *(free text create/edit/drag/transform + clone-drag; attached-text parity still missing)*
- [ ] `ImagePlugin`
- [ ] `HostedSolidWidgetPlugin`
- [ ] `IframeBrowserWidgetPlugin`
- [ ] `GroupPlugin`
- [ ] `ContextMenuPlugin`
- [ ] `ArrowJsPlugin`
- [ ] `SceneHydratorPlugin`

## Note

High-level next direction only.
This changes often.

- keep old `Canvas.service` + old `plugins/` as behavior reference until replacement is proven
- build new path around `runtime.ts`, `new-services/`, and `new-plugins/`
- keep services as main effectful interface
- keep plugins thin; move logic to `fn.*` / `fx.*` / `tx.*` helpers when it helps
- prefer service-local hooks over global runtime hooks for service-specific events
- keep `render` low-level and dumb; plugins decide behavior
- avoid new legacy `CustomEvents` usage in migrated code
- move tool state and tool registry through `EditorService`; toolbar should render from registry, not hardcoded tool lists
- migrate next feature plugins by moving tool registration + feature logic one plugin at a time
- reduce direct engine type leakage from state services over time

## Migration reminders

When migrating an old plugin, do not forget the non-obvious behavior around the happy path.

Checklist:
- register the tool in `EditorService` if the feature is user-selectable
- register node -> element and element -> node handlers in `EditorService` if transform/history/crdt needs them
- wire node-level pointer forwarding if old behavior depended on per-node selection or dblclick behavior
- compare old drag behavior, not just create/edit behavior
- compare old `alt+drag` clone behavior
- compare multi-selection drag passengers and selection handoff after clone/create
- compare transform hooks, scale normalization, and hidden-transformer edit modes
- compare hydration/create-from-element path, not just runtime creation path
- compare history side effects and undo/redo payloads
- compare CRDT writes on create, dragmove, dragend, transformend, edit commit, and delete/cancel
- compare attached or linked behavior such as attached text, linked rect sync, hosted widget attrs, and parent group refresh
- compare render-order/z-index handling

Recent example:
- `TextPlugin` looked migrated after free text create/edit/drag worked
- but old `alt+drag` clone behavior was still missing and had to be added after comparing old listeners/clone helpers
