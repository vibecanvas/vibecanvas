# FILE LIST
Every file must be added here.
This is an important book keeping files.
We need to document if file is slopfree.
Some files are more important than others.
Human review can mark file as clean/minor.
You must update this file after making any edits.
Always take clean files as base reference for edits.
Learn from clean files to produce less slop.

Rules:
- add new entry on file creation (unreviewed)
- delete entry on file deletion
- edit clean file -> MUST MARK AS r!
- edit slop -> keep s
- never add clean or minor by yourself
- entries are grouped by apps/packages

Legend
 - ❓ unreviewed
 - 🤖 ai-touched / needs re-review
 - 🫠 slop
 - ✅ clean
 - 🟡 minor


## packages/canvas
| status | human comment | filename | oneliner when to use | filepath |
|---|---|---|---|---|
| ❓ |  | Canvas.tsx | Automerge-backed canvas runtime mount, loading, teardown orchestration | `packages/canvas/src/components/Canvas.tsx` |
| ❓ |  | index.css | Canvas right-click menu popover styling and item states | `packages/canvas/src/components/CanvasContextMenu/index.css` |
| ❓ |  | index.tsx | Right-click canvas action menu at cursor position | `packages/canvas/src/components/CanvasContextMenu/index.tsx` |
| ❓ |  | help.data.ts | Update help shortcuts, sections, and callout copy together | `packages/canvas/src/components/CanvasHelp/help.data.ts` |
| ❓ |  | index.css | Canvas help modal layout, overlay, shortcuts, keycap styling | `packages/canvas/src/components/CanvasHelp/index.css` |
| ❓ |  | index.tsx | Canvas shortcut help modal with categorized key hints | `packages/canvas/src/components/CanvasHelp/index.tsx` |
| ❓ |  | index.css | Floating canvas recording controls: panel, status, actions, toggle styling | `packages/canvas/src/components/CanvasRecorder/index.css` |
| ❓ |  | index.tsx | Floating recorder panel for capture controls and export | `packages/canvas/src/components/CanvasRecorder/index.tsx` |
| ❓ |  | RuntimeToolbar.tsx | Floating toolbar UI: sanitize SVG icons, reflect editor tool state | `packages/canvas/src/components/FloatingCanvasToolbar/RuntimeToolbar.tsx` |
| ❓ |  | ToolButton.tsx | Floating toolbar button with active and keyboard shortcut badges | `packages/canvas/src/components/FloatingCanvasToolbar/ToolButton.tsx` |
| ❓ |  | index.tsx | Top-center floating canvas tool picker with collapse/sidebar toggles | `packages/canvas/src/components/FloatingCanvasToolbar/index.tsx` |
| ❓ |  | styles.css | Floating canvas/runtime toolbar visuals, states, tooltips, keycap hints | `packages/canvas/src/components/FloatingCanvasToolbar/styles.css` |
| ❓ |  | toolbar.types.ts | Toolbar tool roster and keyboard shortcut mapping source | `packages/canvas/src/components/FloatingCanvasToolbar/toolbar.types.ts` |
| ❓ |  | CapPicker.tsx | Arrow endpoint cap style buttons for selection menu | `packages/canvas/src/components/SelectionStyleMenu/CapPicker.tsx` |
| ❓ |  | ColorPicker.tsx | Theme token swatches for fill/stroke selection popover | `packages/canvas/src/components/SelectionStyleMenu/ColorPicker.tsx` |
| ❓ |  | FontFamilyPicker.tsx | Text styling panel font family option grid selector | `packages/canvas/src/components/SelectionStyleMenu/FontFamilyPicker.tsx` |
| ❓ |  | FontSizePicker.tsx | Text selection font-size preset token picker | `packages/canvas/src/components/SelectionStyleMenu/FontSizePicker.tsx` |
| ❓ |  | LineTypePicker.tsx | Line style selector buttons for selection formatting | `packages/canvas/src/components/SelectionStyleMenu/LineTypePicker.tsx` |
| ❓ |  | OpacitySlider.tsx | Opacity drag math, pointer capture, percent display synchronization | `packages/canvas/src/components/SelectionStyleMenu/OpacitySlider.tsx` |
| ❓ |  | StrokeWidthPicker.tsx | Stroke width option chips inside selection styling menu | `packages/canvas/src/components/SelectionStyleMenu/StrokeWidthPicker.tsx` |
| ❓ |  | TextAlignPicker.tsx | Text alignment toggle in selection style controls | `packages/canvas/src/components/SelectionStyleMenu/TextAlignPicker.tsx` |
| ❓ |  | VerticalAlignPicker.tsx | Text box vertical alignment toggle buttons | `packages/canvas/src/components/SelectionStyleMenu/VerticalAlignPicker.tsx` |
| ❓ |  | index.tsx | Canvas selection styling popover for shape/text properties | `packages/canvas/src/components/SelectionStyleMenu/index.tsx` |
| ❓ |  | types.ts | Selection toolbar option catalogs and style value unions | `packages/canvas/src/components/SelectionStyleMenu/types.ts` |
| ❓ |  | FileHostedWidget.tsx | Hosted file widget wrapper with missing-transport fallback UI | `packages/canvas/src/components/file/FileHostedWidget.tsx` |
| ❓ |  | FileWidget.tsx | Hosted file widget: watch, preview, edit, autosize, conflict state | `packages/canvas/src/components/file/FileWidget.tsx` |
| ❓ |  | file.css | File widget layout, centered loading/empty/error state styling | `packages/canvas/src/components/file/file.css` |
| ❓ |  | getLanguageExtension.ts | CodeMirror language loading by file extension | `packages/canvas/src/components/file/getLanguageExtension.ts` |
| ❓ |  | index.ts | file widgets, hosted rendering, content hooks, shared helpers | `packages/canvas/src/components/file/index.ts` |
| ❓ |  | useFileContent.ts | Solid signals for file read/save, dirty/loading/error state | `packages/canvas/src/components/file/useFileContent.ts` |
| ❓ |  | utils.ts | File previews: infer renderer, basename, binary-to-data URL | `packages/canvas/src/components/file/utils.ts` |
| ❓ |  | CodeEditor.css | Code editor layout, surface flexing, truncated banner styling | `packages/canvas/src/components/file/viewers/CodeEditor.css` |
| ❓ |  | CodeEditor.tsx | Debounced CodeMirror editor, auto-language, truncation locks editing | `packages/canvas/src/components/file/viewers/CodeEditor.tsx` |
| ❓ |  | ImageViewer.css | Centered contained image viewer with loading overlay and muted backdrop | `packages/canvas/src/components/file/viewers/ImageViewer.css` |
| ❓ |  | ImageViewer.tsx | Renders image previews with loading, error, deleted states | `packages/canvas/src/components/file/viewers/ImageViewer.tsx` |
| ❓ |  | PdfViewer.css | PDF viewer layout, header controls, canvas overlay styling | `packages/canvas/src/components/file/viewers/PdfViewer.css` |
| ❓ |  | PdfViewer.tsx | Responsive PDF canvas viewer with paginated rendering | `packages/canvas/src/components/file/viewers/PdfViewer.tsx` |
| ❓ |  | PlaceholderViewer.tsx | Missing binary preview with file metadata/deletion state | `packages/canvas/src/components/file/viewers/PlaceholderViewer.tsx` |
| ❓ |  | shared.css | Shared empty/error viewer state styling across file preview components | `packages/canvas/src/components/file/viewers/shared.css` |
| ❓ |  | FiletreeHostedWidget.tsx | Hosted filetree shell with missing-transport fallback | `packages/canvas/src/components/filetree/FiletreeHostedWidget.tsx` |
| ❓ |  | FiletreeWidget.tsx | Interactive filetree panel with drag-drop, navigation, path picker | `packages/canvas/src/components/filetree/FiletreeWidget.tsx` |
| ❓ |  | PathPickerDialog.tsx | Browse folders and confirm directory selection | `packages/canvas/src/components/filetree/PathPickerDialog.tsx` |
| ❓ |  | createFiletreeContextLogic.ts | Solid filetree state, drag-move, lazy folders, live watch | `packages/canvas/src/components/filetree/createFiletreeContextLogic.ts` |
| ❓ |  | index.ts | Filetree UI barrel: widgets, dialog, context, path display | `packages/canvas/src/components/filetree/index.ts` |
| ❓ |  | path-display.ts | Home-relative path display with cross-platform separator normalization | `packages/canvas/src/components/filetree/path-display.ts` |
| ❓ |  | styles.css | Filetree widget and path dialog visual styling | `packages/canvas/src/components/filetree/styles.css` |
| ❓ |  | GhosttyTerminalMount.css | Ghostty terminal container sizing inside flex layouts | `packages/canvas/src/components/terminal/GhosttyTerminalMount.css` |
| ❓ |  | GhosttyTerminalMount.tsx | Solid Ghostty terminal mount with custom paste/wheel bridging | `packages/canvas/src/components/terminal/GhosttyTerminalMount.tsx` |
| ❓ |  | TerminalHostedWidget.tsx | Hosted terminal wrapper bridging canvas widget lifecycle hooks | `packages/canvas/src/components/terminal/TerminalHostedWidget.tsx` |
| ❓ |  | TerminalWidget.css | Terminal widget chrome, header, status, unavailable, and error styling | `packages/canvas/src/components/terminal/TerminalWidget.css` |
| ❓ |  | TerminalWidget.tsx | Embeds hosted terminal, focus/reload wiring, clipboard image upload | `packages/canvas/src/components/terminal/TerminalWidget.tsx` |
| ❓ |  | createTerminalContextLogic.ts | Solid terminal lifecycle: mount, reconnect, resize, persisted PTY state | `packages/canvas/src/components/terminal/createTerminalContextLogic.ts` |
| ❓ |  | index.ts | Terminal UI barrel: mounts, widgets, context | `packages/canvas/src/components/terminal/index.ts` |
| 🟡 |  | CONSTANTS.ts | Image MIME whitelist and canvas node z-index attribute | `packages/canvas/src/core/CONSTANTS.ts` |
| ✅ |  | fn.create-ordered-z-index.ts | Stable lexicographic z-order keys from numeric indices | `packages/canvas/src/core/fn.create-ordered-z-index.ts` |
| ✅ |  | fn.get-node-z-index.ts | Resolve persisted node stacking order attribute safely | `packages/canvas/src/core/fn.get-node-z-index.ts` |
| 🫠 | mixed pure+impure in fn file | fn.image-utils.ts | Image upload normalization: mime validation, data URLs, dimensions, source fallback | `packages/canvas/src/core/fn.image-utils.ts` |
| ✅ |  | fn.pretext.ts | Canvas text font shorthand for rendering/measurement | `packages/canvas/src/core/fn.pretext.ts` |
| 🫠 | too big; mixed responsibilities | fn.selection-style-menu.ts | Selection style menu sections, defaults, overrides for chosen elements | `packages/canvas/src/core/fn.selection-style-menu.ts` |
| ✅ |  | fn.shape2d.ts | Shape tool drafts, bounds, type mapping, element creation | `packages/canvas/src/core/fn.shape2d.ts` |
| ✅ |  | fn.text-style.ts | Text sizing/alignment presets and proportional preset scaling | `packages/canvas/src/core/fn.text-style.ts` |
| ✅ |  | fn.world-position.ts | Pointer/world coordinate conversion across parent transforms | `packages/canvas/src/core/fn.world-position.ts` |
| ❓ |  | fx.canvas-node-semantics.ts | Konva semantic node typing: group/element checks, parent ancestry | `packages/canvas/src/core/fx.canvas-node-semantics.ts` |
| ❓ |  | fx.filter-selection.ts | Nested canvas selection collapsing to deepest live sub-selection | `packages/canvas/src/core/fx.filter-selection.ts` |
| ❓ |  | fx.node-space.ts | Konva node absolute-to-layer-local coordinate conversion | `packages/canvas/src/core/fx.node-space.ts` |
| ❓ |  | fx.pretext.ts | Pretext line-wrapped text measurement before canvas rendering | `packages/canvas/src/core/fx.pretext.ts` |
| ❓ |  | fx.resolve-selection-style-elements.ts | Resolve style-target elements from selection or focused node | `packages/canvas/src/core/fx.resolve-selection-style-elements.ts` |
| ❓ |  | fx.resolve-selection-style-text-elements.ts | Selection styling: normalize direct and attached text elements | `packages/canvas/src/core/fx.resolve-selection-style-text-elements.ts` |
| ❓ |  | fx.selection-style-element-patch.ts | Selection style edits: clone element, patch text/line/arrow fields | `packages/canvas/src/core/fx.selection-style-element-patch.ts` |
| ❓ |  | tx.apply-selection-style-change.ts | Selected elements style mutation planning, preview, CRDT commit, undo/redo | `packages/canvas/src/core/tx.apply-selection-style-change.ts` |
| ❓ |  | tx.finalize-owned-transform.ts | Finalize owned-node transform, patch CRDT, record undo/redo history | `packages/canvas/src/core/tx.finalize-owned-transform.ts` |
| ❓ |  | tx.set-node-z-index.ts | Persist custom z-layer ordering on Konva nodes | `packages/canvas/src/core/tx.set-node-z-index.ts` |
| ❓ |  | CONSTANTS.ts | Camera viewport persistence, default framing, zoom bounds guardrails | `packages/canvas/src/plugins/camera-control/CONSTANTS.ts` |
| ❓ |  | CameraControl.plugin.ts | Pan/zoom plugin with hand-drag overlay and viewport persistence | `packages/canvas/src/plugins/camera-control/CameraControl.plugin.ts` |
| ✅ |  | fn.get-hand-layer-style.ts | Hand tool layer visibility, interactivity, and cursor state | `packages/canvas/src/plugins/camera-control/fn.get-hand-layer-style.ts` |
| ✅ |  | fn.get-pointer-delta.ts | Pointer drag delta for camera pan updates | `packages/canvas/src/plugins/camera-control/fn.get-pointer-delta.ts` |
| ✅ |  | fn.normalize-camera-state.ts | Sanitize persisted camera viewport before applying pan/zoom | `packages/canvas/src/plugins/camera-control/fn.normalize-camera-state.ts` |
| ❓ |  | fx.read-camera-state-from-localstorage.ts | Restoring persisted camera viewport per canvas startup | `packages/canvas/src/plugins/camera-control/fx.read-camera-state-from-localstorage.ts` |
| ❓ |  | tx.sync-hand-layer.ts | Hand-overlay visibility, hit-testing, cursor synchronization during panning | `packages/canvas/src/plugins/camera-control/tx.sync-hand-layer.ts` |
| ❓ |  | tx.write-camera-state-to-localstorage.ts | Persist per-canvas camera viewport into localStorage safely | `packages/canvas/src/plugins/camera-control/tx.write-camera-state-to-localstorage.ts` |
| ❓ |  | ContextMenu.plugin.ts | Right-click hit-testing, selection resolution, Solid canvas menu mounting | `packages/canvas/src/plugins/context-menu/ContextMenu.plugin.ts` |
| ❓ |  | EventListener.plugin.ts | Bridge Konva stage and DOM input into runtime hooks | `packages/canvas/src/plugins/event-listener/EventListener.plugin.ts` |
| ❓ |  | Grid.plugin.ts | Registers toggleable canvas grid overlay reacting to camera theme resize | `packages/canvas/src/plugins/grid/Grid.plugin.ts` |
| ✅ |  | fn.math.ts | Grid spacing and line offsets from zoom/pan | `packages/canvas/src/plugins/grid/fn.math.ts` |
| ❓ |  | tx.draw.ts | Canvas viewport grid rendering: minor/major lines from pan+zoom layout | `packages/canvas/src/plugins/grid/tx.draw.ts` |
| ❓ |  | Group.plugin.ts | Canvas group lifecycle, boundaries, grouping shortcuts, clone-drag orchestration | `packages/canvas/src/plugins/group/Group.plugin.ts` |
| 🫠 | brittle empty-selection edge case | fn.get-selection-bounds.ts | Multi-node selection bounding box from transformed client rects | `packages/canvas/src/plugins/group/fn.get-selection-bounds.ts` |
| 🫠 | bloated args; service-coupled guards | fn.scene-node.ts | Konva scene node guards, group ancestry, ID lookup | `packages/canvas/src/plugins/group/fn.scene-node.ts` |
| 🫠 | service read logic in fn file | fn.serialize-subtree-elements.ts | Group subtree shape nodes to TElement serialization | `packages/canvas/src/plugins/group/fn.serialize-subtree-elements.ts` |
| ✅ |  | fn.to-group-patch.ts | Konva group serialization into Automerge patch payload | `packages/canvas/src/plugins/group/fn.to-group-patch.ts` |
| ❓ |  | fx.create-group-boundary.ts | Dashed themed group boundary overlay tracking transformed bounds | `packages/canvas/src/plugins/group/fx.create-group-boundary.ts` |
| ❓ |  | tx.create-group-clone-drag.ts | Group duplicate drag preview, subtree re-ID, CRDT commit on drop | `packages/canvas/src/plugins/group/tx.create-group-clone-drag.ts` |
| ❓ |  | tx.group-selection.ts | Groups selected scene nodes with undoable CRDT-backed regrouping | `packages/canvas/src/plugins/group/tx.group-selection.ts` |
| ❓ |  | tx.setup-group-node.ts | Group drag lifecycle: selection, clone-alt-drag, CRDT/history sync, metrics | `packages/canvas/src/plugins/group/tx.setup-group-node.ts` |
| ❓ |  | tx.sync-draggability.ts | Group nesting disables children dragging; selected nodes re-enable dragging | `packages/canvas/src/plugins/group/tx.sync-draggability.ts` |
| ❓ |  | tx.sync-group-boundaries.ts | Selected groups update boundary overlays and cleanup | `packages/canvas/src/plugins/group/tx.sync-group-boundaries.ts` |
| ❓ |  | tx.ungroup-selection.ts | Ungroup selected Konva group, preserve positions, sync CRDT undo/redo | `packages/canvas/src/plugins/group/tx.ungroup-selection.ts` |
| ❓ |  | HistoryControl.plugin.ts | Intercepts Cmd/Ctrl+Z and Shift+Z for history undo/redo | `packages/canvas/src/plugins/history-control/HistoryControl.plugin.ts` |
| ❓ |  | HostedComponent.plugin.ts | Hosted component plugin scaffold wiring required editor scene services | `packages/canvas/src/plugins/hosted-component/HostedComponent.plugin.ts` |
| ❓ |  | Todo.md | Widget manager stores widgets; hosted component reacts/render lifecycle | `packages/canvas/src/plugins/hosted-component/Todo.md` |
| ❓ |  | tx.setup-tool.ts | Repo guardrails: architecture, file conventions, workflow | `packages/canvas/src/plugins/hosted-component/tx.setup-tool.ts` |
| ❓ |  | Image.plugin.ts | Image import, paste/drop, node sync, clone-drag orchestration | `packages/canvas/src/plugins/image/Image.plugin.ts` |
| ✅ |  | fn.create-image-element.ts | Center-placed image element creation from dimensions and source metadata | `packages/canvas/src/plugins/image/fn.create-image-element.ts` |
| ✅ |  | fn.fit-image-to-viewport.ts | Initial viewport image fit sizing capped to half smaller viewport dimension | `packages/canvas/src/plugins/image/fn.fit-image-to-viewport.ts` |
| ✅ |  | fn.to-image-element.ts | Image payload → canonical canvas element with style/data | `packages/canvas/src/plugins/image/fn.to-image-element.ts` |
| ❓ |  | tx.clone-backend-file-for-element.ts | Duplicate backend image asset, update node and CRDT URL | `packages/canvas/src/plugins/image/tx.clone-backend-file-for-element.ts` |
| ❓ |  | tx.create-image-clone-drag.ts | Image clone drag finalizes preview, persistence, undo/redo, selection | `packages/canvas/src/plugins/image/tx.create-image-clone-drag.ts` |
| ❓ |  | tx.insert-image.ts | Image upload insertion with viewport fitting, CRDT, undo/redo | `packages/canvas/src/plugins/image/tx.insert-image.ts` |
| ❓ |  | tx.setup-image-listeners.ts | Attach image selection, clone-drag, multi-drag history listeners | `packages/canvas/src/plugins/image/tx.setup-image-listeners.ts` |
| ❓ |  | tx.update-image-node-from-element.ts | Sync Konva image node from canvas element state | `packages/canvas/src/plugins/image/tx.update-image-node-from-element.ts` |
| ❓ |  | index.ts | Canvas plugin barrel export surface for aggregate imports | `packages/canvas/src/plugins/index.ts` |
| ❓ |  | CONSTANTS.ts | Pen defaults: fill, opacity, stroke-width token mapping | `packages/canvas/src/plugins/pen/CONSTANTS.ts` |
| ❓ |  | Pen.plugin.ts | Pen plugin orchestrates freehand drafting, hydration, drag, clone, transforms | `packages/canvas/src/plugins/pen/Pen.plugin.ts` |
| ✅ |  | fn.draft-element.ts | Pen stroke points → draft canvas element with timestamps | `packages/canvas/src/plugins/pen/fn.draft-element.ts` |
| ✅ |  | fn.math.ts | Pen stroke geometry: normalize, serialize, scale, SVG outline generation | `packages/canvas/src/plugins/pen/fn.math.ts` |
| 🫠 | sloppy details; unused strokeWidth arg | fn.style.ts | Pen style normalization, color-key selection, node-derived style cloning | `packages/canvas/src/plugins/pen/fn.style.ts` |
| ❓ |  | fx.create-node.ts | Pen element → themed Konva.Path with stroke-derived fill and metadata | `packages/canvas/src/plugins/pen/fx.create-node.ts` |
| ❓ |  | fx.path.ts | Pen path metadata detection and element serialization helpers | `packages/canvas/src/plugins/pen/fx.path.ts` |
| ❓ |  | fx.start-draft.ts | Initialize non-interactive pen draft node from first point | `packages/canvas/src/plugins/pen/fx.start-draft.ts` |
| ❓ |  | tx.clone.ts | Pen stroke duplicate preview drag, finalize CRDT-backed selectable clone | `packages/canvas/src/plugins/pen/tx.clone.ts` |
| ❓ |  | tx.path.ts | Konva pen node creation/update from themed element strokes | `packages/canvas/src/plugins/pen/tx.path.ts` |
| ❓ |  | tx.update-draft.ts | Live pen draft stroke preview updates while drawing | `packages/canvas/src/plugins/pen/tx.update-draft.ts` |
| ❓ |  | CONSTANTS.ts | Recorder event schema and CRDT snapshot payload contracts | `packages/canvas/src/plugins/recorder/CONSTANTS.ts` |
| ❓ |  | Recorder.plugin.ts | Dev recorder plugin captures input/CRDT, mounts exportable replay panel | `packages/canvas/src/plugins/recorder/Recorder.plugin.ts` |
| 🫠 | impure/event shaping living in fn file | fn.recording.ts | Builds normalized recording steps and CRDT snapshots | `packages/canvas/src/plugins/recorder/fn.recording.ts` |
| ❓ |  | tx.file.ts | JSON export save flow: picker first, anchor-download fallback | `packages/canvas/src/plugins/recorder/tx.file.ts` |
| ❓ |  | tx.mount.ts | Mounts recorder overlay panel onto scene stage | `packages/canvas/src/plugins/recorder/tx.mount.ts` |
| ❓ |  | RenderOrder.plugin.ts | Canvas context-menu layer ordering for sibling selections | `packages/canvas/src/plugins/render-order/RenderOrder.plugin.ts` |
| ❓ |  | SceneHydrator.plugin.ts | Rehydrate Konva scene from CRDT, preserving selection/editor state | `packages/canvas/src/plugins/scene-hydrator/SceneHydrator.plugin.ts` |
| ❓ |  | Select.plugin.ts | Canvas selection, marquee drag, delete, drill-down interactions | `packages/canvas/src/plugins/select/Select.plugin.ts` |
| ✅ |  | fn.get-selection-path.ts | Ancestor canvas-node selection path from node to foreground layer | `packages/canvas/src/plugins/select/fn.get-selection-path.ts` |
| ❓ |  | tx.delete-selection.ts | Delete selected canvas nodes with undo/redo snapshot restoration | `packages/canvas/src/plugins/select/tx.delete-selection.ts` |
| ❓ |  | tx.handle-element-pointer-double-click.ts | Double-click drills selection one level deeper along ancestry | `packages/canvas/src/plugins/select/tx.handle-element-pointer-double-click.ts` |
| ❓ |  | tx.handle-element-pointer-down.ts | Element click selection depth cycling, shift-toggle, focus updates | `packages/canvas/src/plugins/select/tx.handle-element-pointer-down.ts` |
| ❓ |  | tx.handle-stage-pointer-move.ts | Drag-select updates rectangle, intersects top-layer selectable nodes | `packages/canvas/src/plugins/select/tx.handle-stage-pointer-move.ts` |
| ❓ |  | SelectionStyleMenu.plugin.ts | Floating selection style popover wiring with Solid, Konva, CRDT commits | `packages/canvas/src/plugins/selection-style-menu/SelectionStyleMenu.plugin.ts` |
| ❓ |  | fx.mount-selection-style-menu.ts | Selection styling overlay for selected elements and active tools | `packages/canvas/src/plugins/selection-style-menu/fx.mount-selection-style-menu.ts` |
| ❓ |  | CONSTANTS.ts | Shape1D defaults, tokens, handle geometry, drag snapshot types | `packages/canvas/src/plugins/shape1d/CONSTANTS.ts` |
| ❓ |  | Shape1d.plugin.ts | Line/arrow plugin: draft, edit handles, transform/history sync | `packages/canvas/src/plugins/shape1d/Shape1d.plugin.ts` |
| ✅ |  | fn.draft.ts | Shape1d draft and fallback preview element construction | `packages/canvas/src/plugins/shape1d/fn.draft.ts` |
| ❓ |  | fx.geometry.ts | Shape1D coordinate transforms, insertion midpoints, anchor-drag geometry updates | `packages/canvas/src/plugins/shape1d/fx.geometry.ts` |
| ❓ |  | fx.node.ts | shape1d Konva guards, styling, world-position serialization | `packages/canvas/src/plugins/shape1d/fx.node.ts` |
| ❓ |  | tx.element.ts | Shape node sync and preview clone creation | `packages/canvas/src/plugins/shape1d/tx.element.ts` |
| ❓ |  | tx.history.ts | Shape1d undo/redo for element edits and creation | `packages/canvas/src/plugins/shape1d/tx.history.ts` |
| ❓ |  | tx.render.ts | Konva line/arrow node creation, caps, bounds, scene runtime | `packages/canvas/src/plugins/shape1d/tx.render.ts` |
| ❓ |  | tx.runtime.ts | Shape drag, clone-drag, multi-select movement, history/CRDT sync | `packages/canvas/src/plugins/shape1d/tx.runtime.ts` |
| ❓ |  | Shape2d.plugin.ts | Shape drawing lifecycle, preview, cloning, attached-text sync | `packages/canvas/src/plugins/shape2d/Shape2d.plugin.ts` |
| ✅ |  | fn.node.ts | Konva node kind resolution via attrs plus runtime class guards | `packages/canvas/src/plugins/shape2d/fn.node.ts` |
| ✅ |  | fn.text-host-bounds.ts | Shape text layout bounds for rect, ellipse, diamond | `packages/canvas/src/plugins/shape2d/fn.text-host-bounds.ts` |
| ❓ |  | fx.attached-text.ts | Shape-embedded text creation, syncing, persistence, edit-mode handoff | `packages/canvas/src/plugins/shape2d/fx.attached-text.ts` |
| ❓ |  | fx.create-node.ts | Shape element → themed Konva node factory | `packages/canvas/src/plugins/shape2d/fx.create-node.ts` |
| ❓ |  | fx.to-element.ts | Konva shape node → persisted canvas element snapshot | `packages/canvas/src/plugins/shape2d/fx.to-element.ts` |
| ❓ |  | tx.create-clone-drag.ts | Shape clone preview drag, finalize persist, history, linked duplicates | `packages/canvas/src/plugins/shape2d/tx.create-clone-drag.ts` |
| ❓ |  | tx.setup-node.ts | Shape node events: selection, clone-drag, multi-drag, CRDT history | `packages/canvas/src/plugins/shape2d/tx.setup-node.ts` |
| ❓ |  | tx.update-node-from-element.ts | Syncs shape nodes from element props into Konva scene | `packages/canvas/src/plugins/shape2d/tx.update-node-from-element.ts` |
| ❓ |  | CONSTANTS.ts | Text plugin typography defaults and preset-token mappings | `packages/canvas/src/plugins/text/CONSTANTS.ts` |
| ❓ |  | Text.plugin.ts | Free-text plugin: create, edit, transform, theme-sync, serialize Konva text | `packages/canvas/src/plugins/text/Text.plugin.ts` |
| ✅ |  | fn.compute-text-height.ts | Auto-resizing multiline text node bounding-box height | `packages/canvas/src/plugins/text/fn.compute-text-height.ts` |
| ✅ |  | fn.create-text-element.ts | Creating default persisted text elements from coordinates and timestamps | `packages/canvas/src/plugins/text/fn.create-text-element.ts` |
| ❓ |  | fx.compute-text-width.ts | Konva multiline text autosize width measurement | `packages/canvas/src/plugins/text/fx.compute-text-width.ts` |
| ❓ |  | fx.to-element.ts | Konva text nodes to persisted canvas elements | `packages/canvas/src/plugins/text/fx.to-element.ts` |
| ❓ |  | tx.create-text-clone-drag.ts | Text drag-duplicate preview committed on drag end | `packages/canvas/src/plugins/text/tx.create-text-clone-drag.ts` |
| ❓ |  | tx.enter-edit-mode.ts | Inline textarea editing for canvas text/shape labels | `packages/canvas/src/plugins/text/tx.enter-edit-mode.ts` |
| ❓ |  | tx.setup-text-node.ts | Text node pointer hooks, drag sync, alt-clone history | `packages/canvas/src/plugins/text/tx.setup-text-node.ts` |
| ❓ |  | tx.update-text-node-from-element.ts | Existing Konva text node visual sync from text element model | `packages/canvas/src/plugins/text/tx.update-text-node-from-element.ts` |
| ❓ |  | Toolbar.plugin.ts | Runtime toolbar bootstrap: tools, hotkeys, cursor, temporary hand | `packages/canvas/src/plugins/toolbar/Toolbar.plugin.ts` |
| ❓ |  | Transform.plugin.ts | Selection transform, drag-proxy moves, resize/rotate hooks, history | `packages/canvas/src/plugins/transform/Transform.plugin.ts` |
| ❓ |  | fx.proxy-bounds.ts | Transform overlay needs layer-relative rotated shape bounds | `packages/canvas/src/plugins/transform/fx.proxy-bounds.ts` |
| ❓ |  | fx.proxy-drag-target.ts | Single selected shape or pen path proxy-drag target | `packages/canvas/src/plugins/transform/fx.proxy-drag-target.ts` |
| ❓ |  | fx.selection-transform-options.ts | Selection transformer anchors ratio border flip resolution | `packages/canvas/src/plugins/transform/fx.selection-transform-options.ts` |
| ❓ |  | tx.dispatch-selection-transform-hooks.ts | Selection-transform hook fanout; aggregate cancel/crdt, track handled nodes | `packages/canvas/src/plugins/transform/tx.dispatch-selection-transform-hooks.ts` |
| ❓ |  | tx.sync-transformer.ts | Selection or edit-mode changes sync transformer state | `packages/canvas/src/plugins/transform/tx.sync-transformer.ts` |
| ❓ |  | VisualDebug.plugin.ts | On-canvas debug overlay: camera, selection, focused node | `packages/canvas/src/plugins/visual-debug/VisualDebug.plugin.ts` |
| ❓ |  | CameraService.ts | Canvas camera pan/zoom viewport state driving scene layers | `packages/canvas/src/services/camera/CameraService.ts` |
| ❓ |  | CanvasRegistryService.ts | Canvas semantic registry: nodes↔elements/groups, lifecycle hooks, selection config | `packages/canvas/src/services/canvas-registry/CanvasRegistryService.ts` |
| ✅ |  | types.ts | Canvas registry typings for elements, groups, transform/style hooks | `packages/canvas/src/services/canvas-registry/types.ts` |
| 🫠 | weak merge semantics; convention drift | fn-merge-selection-style-menu-configs.ts | Combining layered selection-style menu configs across canvas registry | `packages/canvas/src/services/canvas-registry/fn-merge-selection-style-menu-configs.ts` |
| ✅ |  | fn.sort-by-priority.ts | Deterministic registry ordering: ascending priority, stable id tiebreak | `packages/canvas/src/services/canvas-registry/fn.sort-by-priority.ts` |
| ❓ |  | ContextMenuService.ts | Right-click canvas/item/selection menus from plugin-provided actions | `packages/canvas/src/services/context-menu/ContextMenuService.ts` |
| ❓ |  | CrdtService.ts | Canvas CRDT service with tracked local writes | `packages/canvas/src/services/crdt/CrdtService.ts` |
| ✅ |  | fxBuilder.ts | Batch canvas CRDT patches/deletes into commit+rollback ops | `packages/canvas/src/services/crdt/fxBuilder.ts` |
| ✅ |  | tx.apply-ops.ts | Replay recorded CRDT entity ops into Automerge | `packages/canvas/src/services/crdt/tx.apply-ops.ts` |
| ✅ |  | EditorService.ts | Editor tool state, draft previews, CRDT commits | `packages/canvas/src/services/editor/EditorService.ts` |
| ✅ |  | fx.get-canvas-point.ts | Editor tool pointer events → canvas point + pressure | `packages/canvas/src/services/editor/fx.get-canvas-point.ts` |
| ✅ |  | types.ts | Editor tool registry, draw-draft contracts, state hooks | `packages/canvas/src/services/editor/types.ts` |
| ✅ |  | HistoryService.ts | Undo/redo stack service for runtime actions | `packages/canvas/src/services/history/HistoryService.ts` |
| ✅ |  | index.ts | Central barrel for canvas service imports | `packages/canvas/src/services/index.ts` |
| ✅ |  | LoggingService.ts | Canvas debug logs gated by per-target localStorage | `packages/canvas/src/services/logging/LoggingService.ts` |
| ❓ |  | RenderOrderService.ts | Bundle-aware sibling z-order with history/CRDT sync | `packages/canvas/src/services/render-order/RenderOrderService.ts` |
| ✅ |  | SceneService.ts | Konva stage lifecycle, layers, container resize hook | `packages/canvas/src/services/scene/SceneService.ts` |
| ✅ |  | CONSTANTS.ts | Canvas interaction mode switches: hand, select, draw, click-create | `packages/canvas/src/services/selection/CONSTANTS.ts` |
| ❓ |  | SelectionService.ts | canvas selection state, focus, mode, change notifications | `packages/canvas/src/services/selection/SelectionService.ts` |
| ✅ |  | CONSTANTS.ts | Widget host chrome geometry IDs traffic lights | `packages/canvas/src/services/widget/CONSTANTS.ts` |
| ✅ |  | WidgetManagerService.ts | Registers widget tools canvas adapters example widget | `packages/canvas/src/services/widget/WidgetManagerService.ts` |
| ✅ |  | fx.draw-host.ts | Editor draw-tool host draft creation and drag resizing | `packages/canvas/src/services/widget/fx.draw-host.ts` |
| ✅ |  | fx.register-tool.ts | Editor tool registration for drawable widget configs | `packages/canvas/src/services/widget/fx.register-tool.ts` |
| 🫠 | empty file | fn.to-element.ts |  | `packages/canvas/src/services/widget/fn.to-element.ts` |
| ✅ |  | interface.ts | Widget manager service contracts: hooks, dependencies, tool config | `packages/canvas/src/services/widget/interface.ts` |
| 🟡 |  | automerge.ts | Browser Automerge repo, persisted doc handles, WebSocket sync | `packages/canvas/src/automerge.ts` |
| 🫠 |  | base.css | Global theme tokens, dark mode, baseline element resets | `packages/canvas/src/base.css` |
| 🟡 |  | index.ts | Package entrypoint: base styles + Canvas export | `packages/canvas/src/index.ts` |
| ✅ |  | runtime.ts | Canvas editor startup wiring services hooks plugins | `packages/canvas/src/runtime.ts` |
| ✅ |  | types.ts | Shared canvas runtime config, hooks, events, image-service contracts | `packages/canvas/src/types.ts` |

## .pi/extensions/functional-core
| status | human comment | filename | oneliner when to use | filepath |
|---|---|---|---|---|
| 🤖 |  | README.md | Use this when checking or updating the functional-core extension docs, especially the CONSTANTS.ts and GUARDS.ts import exceptions. | `.pi/extensions/functional-core/README.md` |
| ❓ |  | index.ts | Use this when wiring the functional-core extension entrypoint that registers the fn, fx, and tx checks together. | `.pi/extensions/functional-core/index.ts` |
| 🤖 |  | fn-check.ts | Use this when changing the fn.*.ts enforcement rules, including allowed GUARDS.ts imports and instanceof guidance. | `.pi/extensions/functional-core/fn-check.ts` |
| 🤖 |  | fx-check.ts | Use this when changing the fx.*.ts enforcement rules, including allowed GUARDS.ts imports and instanceof guidance. | `.pi/extensions/functional-core/fx-check.ts` |
| 🤖 |  | tx-check.ts | Use this when changing the tx.*.ts enforcement rules, including allowed GUARDS.ts imports and instanceof guidance. | `.pi/extensions/functional-core/tx-check.ts` |
| ❓ |  | blocked-tool-log.ts | Use this when persisting structured records for tool calls blocked by the functional-core extension. | `.pi/extensions/functional-core/lib/blocked-tool-log.ts` |
| ❓ |  | edit-preview.ts | Use this when previewing the next file contents produced by an edit tool call before validation runs. | `.pi/extensions/functional-core/lib/edit-preview.ts` |
| ❓ |  | runtime-global-usage.ts | Use this when checking fn, fx, or tx files for forbidden direct runtime global usage. | `.pi/extensions/functional-core/lib/runtime-global-usage.ts` |
| ❓ |  | blocked-tool-log.test.ts | Use this when verifying the blocked-tool logging helper writes JSONL entries correctly. | `.pi/extensions/functional-core/tests/blocked-tool-log.test.ts` |
| ❓ |  | edit-preview.test.ts | Use this when verifying edit previews apply ordered replacements the same way the extension expects. | `.pi/extensions/functional-core/tests/edit-preview.test.ts` |
| ❓ |  | runtime-global-usage.test.ts | Use this when verifying the runtime-global checker allows injected access and blocks direct globals. | `.pi/extensions/functional-core/tests/runtime-global-usage.test.ts` |
