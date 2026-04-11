# Canvas design

## Services

- [x] `render` - stage, layers, low-level engine refs, resize hook
- [x] `camera` - x/y/zoom, pan/zoom ops, change hook
- [x] `editor` - tool registry, active tool, editing state, previews, transform refs
- [x] `selection` - mode, selection, focused id
- [x] `theme` - current theme
- [ ] `history`
- [ ] `crdt`
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
- [ ] `HistoryControlPlugin`
- [ ] `SelectionStyleMenuPlugin`
- [ ] `HelpPlugin`
- [ ] `RecorderPlugin` (`DEV` only)
- [ ] `RenderOrderPlugin`
- [x] `SelectPlugin`
- [ ] `TransformPlugin`
- [ ] `Shape1dPlugin`
- [ ] `Shape2dPlugin`
- [ ] `PenPlugin`
- [ ] `TextPlugin`
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
