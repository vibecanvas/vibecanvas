# Canvas design

## Services

- [x] `render` - stage, layers, low-level engine refs, resize hook
- [x] `camera` - x/y/zoom, pan/zoom ops, change hook
- [x] `theme` - current theme
- [x] `selection` - mode, selection, focused id
- [x] `editor` - editing state, previews, transform refs
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

- [ ] `EventListenerPlugin`
- [x] `GridPlugin`
- [ ] `VisualDebugPlugin`
- [ ] `CameraControlPlugin`
- [ ] `HistoryControlPlugin`
- [ ] `ToolbarPlugin`
- [ ] `SelectionStyleMenuPlugin`
- [ ] `HelpPlugin`
- [ ] `RecorderPlugin` (`DEV` only)
- [ ] `RenderOrderPlugin`
- [ ] `SelectPlugin`
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
This may change often.

- keep moving old plugin-context behavior into small services + thin runtime plugins
- prefer service-local hooks over global runtime hooks for service-specific events
- keep `render` low-level and dumb; plugins own behavior
- move input and pointer wiring out of legacy custom events into runtime hooks/services
- migrate next core plugins around camera/view/input behavior first
- reduce direct engine type leakage from state services over time
- keep old plugins/services as behavior reference until new path is proven
