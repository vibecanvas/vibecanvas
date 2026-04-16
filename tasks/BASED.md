# Overview

## Introduction

Building software is explorative, creative and sometimes dull and repetitive.
This document outline the how build software in a highly technical,
small and motivated team. The goal is to minimize management
and maximize throughput. The idea behind Based is that programming is 90% context loading and 10% actual solving and coding. Therefore we should batch work for context loading and minimize context switching.
Based skips the traditional agile ceremonies and focuses on the codebase and a glorified todo list.
The todo list is the heart of the project. No tickets, no boards, no sprints, no backlog.
Just a list of things to do. The list is grouped into 5 and ordered by importance within each group.
Every dev opens a branch and picks a set of items they want to work on. They open a file based on
their branch and copy the items and explain what they are doing. Once merged the items are removed
from the list the branch file is kept.

Every change in the codebase can be grouped into one of the following categories:

B ugs: Something is not working as expected.
A dditions: New features or improvements.
S ubtractions: Removing or simplifing parts of the codebase.
E xplorations: Researching new technologies or ideas.
D irections: Highlevel ideas for where to go and what to do next.

The status are tagged:
- [ ]: open
- [x]: closed
- [?]: unsure
- [!]: urgent
- [~]: in progress
- [/]: blocked

Remember to keep the codebase small. Small is clean, small is fast. Delete often.

## Structure

Based now lives at the repository root in `tasks/`.

- `tasks/BASED.md`: overview, active index, and conventions.
- `tasks/b/`: bug files.
- `tasks/a/`: addition files.
- `tasks/s/`: subtraction files.
- `tasks/e/`: exploration files.
- `tasks/d/`: direction files.

Each line in the overview stays short and links to one dedicated file.
Each dedicated file stores the task context, TODOs, notes, and logs.

## Format

Overview entries use this format:

`- [x]: [B1](b/B1.md) - text: edit jumping`

Humans usually don't create leaf files. But agents do.

Leaf files use this format:

```md
# B1 - text: edit jumping
[Overview](../../BASED.md)

<Short summary - This is read by humans. Keep it short>

## Context
<Longer explanation of the problem. Must link all relevent files.>

## Plan
<What you plan to do. Step by step plan. Use subsections>

## TODOS
<Checklist - derived from plan>
- [ ] ...

## NOTES
<Notes - Anything non trivial you discovered or want to remember>
...

### LOGS
<Logs - log any action you take>

---
```

Use the overview for scanning.
Use the leaf files for execution history and local context.

## B ugs
- [x]: [B1](b/B1.md) - text: edit jumping
- [x]: [B2](b/B2.md) - text: long, on select, box too small
- [x]: [B3](b/B3.md) - version update not showing
- [x]: [B4](b/B4.md) - update progress cli not moving
- [x]: [B7](b/B7.md) - iframe browser: click can latch canvas drag and trap release
- [x]: [B8](b/B8.md) - hosted widgets: transformer resize loses control when pointer crosses DOM
- [x]: [B9](b/B9.md) - hosted/iframe widgets: canvas drag not persisted on reload
- [x]: [B10](b/B10.md) - style menu: drag then style jumps selection back to old position
- [x]: [B11] - terminal after resize is not focuable anymore
- [x]: [B12](b/B12.md) - terminal: ctrl+c echoes ^C but does not interrupt process
- [x]: [B13](b/B13.md) - canvas CLI: top-level alias docs lie; `vibecanvas query ...` is rejected
- [x]: [B14](b/B14.md) - canvas CLI: `canvas group --help` falls back to global help
- [x]: [B15](b/B15.md) - canvas CLI: `--json` output is not real JSON
- [ ]: [B16](b/B16.md) - ci: `@vibecanvas/canvas` tests load Konva node entry and require native `canvas` - only fails in ci
- [x]: [B21](b/B21.md) - filesystem: recursive filetree scan dies on EPERM/EACCES folders like `~/.Trash`
- [x]: [B17](b/B17.md) - canvas CLI: `add --schema rect` still requires an element source instead of printing schema
- [x]: [B18](b/B18.md) - terminal image paste not working in deploy version
- [x]: [B19](b/B19.md) - cli usage -> no realtime updates via automerge
- [x]: [B20](b/B20.md) - pen tool: after stroke commit, stay in pen mode instead of switching to selection
- [x]: [B21] - can't do 1d edits
- [x]: [B22] - style color pallet breaks layout
- [ ]: [B23] - bug: pan/zoom on textedit -> text box moves with 

## A dditions
- [x]: [A1] - file: support common CodeMirror languages
- [x]: [A2] - add inline text support to diamond and ellipse
- [ ]: [A3] - copy paste elements/groups
- [x]: [A4](a/A4.md) - terminal: use PartySocket for resilient PTY connection
- [x]: [A5](a/A5.md) - canvas CLI: explicit --db path override
- [x]: [A6](a/A6.md) - canvas CLI: end-to-end test harness
- [x]: [A7](a/A7.md) - canvas CLI: `list` command
- [x]: [A8](a/A8.md) - canvas CLI: `inspect` command (removed; use `query --id`)
- [x]: [A9](a/A9.md) - canvas CLI: `query` command
- [x]: [A10](a/A10.md) - canvas CLI: `patch` command
- [x]: [A11](a/A11.md) - canvas CLI: `move` command
- [x]: [A12](a/A12.md) - canvas CLI: `group` command
- [x]: [A13](a/A13.md) - canvas CLI: `ungroup` command
- [x]: [A14](a/A14.md) - canvas CLI: `delete` command
- [x]: [A15](a/A15.md) - canvas CLI: `reorder` command
- [x]: [A17](a/A17.md) - rect dbl click -> enter edit mode (inline text)
- [x]: [A18] - lift cmds to be api to allow live changes via crdt
- [x]: [A19](a/A19.md) - canvas CLI: `add` command
- [x]: [A20](a/A20.md) - canvas CLI: agent-friendly help, discovery, and forgiving errors
- [x]: [A21](a/A21.md) - canvas CLI: add `--dry-run` for add/patch/move/group/ungroup/delete
- [ ]: [A22](a/A22.md) - canvas CLI: allow JSON array payloads for multi-element add and multi-target patch
- [x]: [A23](a/A23.md) - canvas CLI: document minimal required add args per element type and default optional fields
- [x]: [A24](a/A24.md) - filetree: double click file opens preview beside tree inside camera view
- [x]: [A25](a/A25.md) - canvas: react to live Automerge doc changes without page refresh
- [ ]: [A26] - remember canvas position for each canvas locally
- [x]: [A27](a/A27.md) - theme: make canvas overlays and terminal fully theme-aware
- [x]: [A29](a/A29.md) - theme: remember last light and dark theme choices when toggling
- [x]: [A30](a/A30.md) - theme: remove Tailwind from @vibecanvas/canvas and ship package CSS
- [x]: [A31](a/A31.md) - theme: remove Tailwind from frontend and stop scanning canvas sources
- [ ]: [A32](a/A32.md) - hosted components: sandboxed Arrow runtime + per-component official packages
- [ ]: [A33] - deeplink to canvas object
- [ ]: [A34](a/A34.md) - canvas: scene hydrator incremental reconcile instead of full reload on change
- [ ]: [A35] - multiselect => clone drag
- [ ]: [A36](a/A36.md) - theme: centralize canvas style ownership in ThemeService

### A36 detailed plan
[Leaf task](a/A36.md)

ThemeService becomes the single source of truth for canvas style defaults, token lookup, per-tool manual style memory, and theme-driven runtime resolution. Canvas docs keep sparse optional style fields plus base transform scale, and renderers resolve concrete values through ThemeService.

#### Locked decisions
- ThemeService owns canvas style defaults and token/runtime lookup.
- ThemeService stores last manual selection per tool scope (`pen`, `text`, `rectangle`, `arrow`, etc.).
- ThemeService must stay canvas-service agnostic; use plain string scope ids.
- Canvas doc style fields remain optional.
- No backward compatibility or migration layer.
- Base element gets persisted `scaleX` / `scaleY`.
- Shape2d single-node resize still bakes geometry (`x/y/w/h`) and resets scale to `1/1`.
- Grouped or multi-selected shape2d can persist scale.
- Image, pen, text, and shape1d preserve scale.
- Text persistence stops storing runtime `fontSize`, `fontSizePreset`, and `lineHeight`.
- `textAlign` / `verticalAlign` move into `style`.
- `headerColor` and `borderColor` are removed.
- `strokeColor` is the canonical stroke/border/text color field.
- Tokenized style fields:
  - `backgroundColor`
  - `strokeColor`
  - `strokeWidth`
  - `cornerRadius`
  - `fontSize`
- Non-tokenized style fields:
  - `opacity`
  - `strokeStyle`
  - `textAlign`
  - `verticalAlign`
- Selection style menu must not own style state; ThemeService becomes the style-state source.
- Non-style data editors are out of scope for ThemeService centralization.

#### Target persisted model
##### Base element
Persist transform state in base element:
- `x`
- `y`
- `rotation`
- `scaleX`
- `scaleY`

##### Style
All optional:
- `backgroundColor?: string`
- `strokeColor?: string`
- `strokeWidth?: string`
- `opacity?: number`
- `cornerRadius?: string`
- `strokeStyle?: "solid" | "dashed" | "dotted"`
- `fontSize?: string`
- `textAlign?: "left" | "center" | "right"`
- `verticalAlign?: "top" | "middle" | "bottom"`

##### Text data
Keep text `data` structural only:
- keep: `w`, `h`, `text`, `originalText`, `fontFamily`, `link`, `containerId`, `autoResize`
- remove: `fontSize`, `fontSizePreset`, `textAlign`, `verticalAlign`, `lineHeight`
- runtime resolves numeric font size and hardcoded line height at render/edit time

##### Canonical color usage
- `backgroundColor` is fill
- `strokeColor` is stroke/border/text color
- stroke-only elements should stop storing their color in `backgroundColor`
- keep `@transparent` as the special no-fill token unless implementation proves it is dead

#### Mandatory read list for the next agent
Read sections `0` through `3` fully before product edits, then the lane being changed, then the tests.

##### 0. Task docs and external contract
- `tasks/BASED.md`
- `tasks/a/A36.md`
- `https://konvajs.org/api/Konva.Text.html`

##### 1. Theme service package and consumers
- `packages/service-theme/src/ThemeService.ts`
- `packages/service-theme/src/index.ts`
- `packages/service-theme/src/types.ts`
- `packages/service-theme/src/styles.ts`
- `packages/service-theme/src/builtins.ts`
- `packages/service-theme/src/style.shared.ts`
- `packages/service-theme/src/style.light.ts`
- `packages/service-theme/src/style.dark.ts`
- `packages/service-theme/src/style.sepia.ts`
- `packages/service-theme/src/style.graphite.ts`
- `packages/service-theme/src/dom.ts`
- `apps/frontend/src/services/theme.ts`

##### 2. Persisted schema and runtime wiring
- `packages/service-automerge/src/types/canvas-doc.zod.ts`
- `packages/service-automerge/src/types/canvas-doc.types.ts`
- `packages/canvas/src/runtime.ts`
- `packages/canvas/tests/new-test-setup.ts`

##### 3. Menu, selection-style core, and current state owners
- `packages/canvas/src/services/editor/EditorService.ts`
- `packages/canvas/src/services/canvas-registry/CanvasRegistryService.ts`
- `packages/canvas/src/core/fn.selection-style-menu.ts`
- `packages/canvas/src/core/tx.apply-selection-style-change.ts`
- `packages/canvas/src/core/fx.selection-style-element-patch.ts`
- `packages/canvas/src/core/fn.text-style.ts`
- `packages/canvas/src/core/fx.pretext.ts`
- `packages/canvas/src/components/SelectionStyleMenu/index.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/ColorPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/StrokeWidthPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/FontSizePicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/OpacitySlider.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/TextAlignPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/VerticalAlignPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/FontFamilyPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/LineTypePicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/CapPicker.tsx`
- `packages/canvas/src/components/SelectionStyleMenu/types.ts`
- `packages/canvas/src/plugins/selection-style-menu/SelectionStyleMenu.plugin.ts`
- `packages/canvas/src/plugins/selection-style-menu/fx.mount-selection-style-menu.ts`

##### 4. Shape2d lane
- `packages/canvas/src/core/fn.shape2d.ts`
- `packages/canvas/src/plugins/shape2d/Shape2d.plugin.ts`
- `packages/canvas/src/plugins/shape2d/fn.node.ts`
- `packages/canvas/src/plugins/shape2d/fn.text-host-bounds.ts`
- `packages/canvas/src/plugins/shape2d/fx.attached-text.ts`
- `packages/canvas/src/plugins/shape2d/fx.create-node.ts`
- `packages/canvas/src/plugins/shape2d/fx.to-element.ts`
- `packages/canvas/src/plugins/shape2d/tx.create-clone-drag.ts`
- `packages/canvas/src/plugins/shape2d/tx.setup-node.ts`
- `packages/canvas/src/plugins/shape2d/tx.update-node-from-element.ts`

##### 5. Text lane
- `packages/canvas/src/plugins/text/Text.plugin.ts`
- `packages/canvas/src/plugins/text/fn.create-text-element.ts`
- `packages/canvas/src/plugins/text/fn.compute-text-height.ts`
- `packages/canvas/src/plugins/text/fx.compute-text-width.ts`
- `packages/canvas/src/plugins/text/fx.to-element.ts`
- `packages/canvas/src/plugins/text/tx.create-text-clone-drag.ts`
- `packages/canvas/src/plugins/text/tx.enter-edit-mode.ts`
- `packages/canvas/src/plugins/text/tx.setup-text-node.ts`
- `packages/canvas/src/plugins/text/tx.update-text-node-from-element.ts`

##### 6. Pen lane
- `packages/canvas/src/plugins/pen/CONSTANTS.ts`
- `packages/canvas/src/plugins/pen/Pen.plugin.ts`
- `packages/canvas/src/plugins/pen/fn.draft-element.ts`
- `packages/canvas/src/plugins/pen/fn.style.ts`
- `packages/canvas/src/plugins/pen/fx.create-node.ts`
- `packages/canvas/src/plugins/pen/fx.path.ts`
- `packages/canvas/src/plugins/pen/fx.start-draft.ts`
- `packages/canvas/src/plugins/pen/tx.clone.ts`
- `packages/canvas/src/plugins/pen/tx.path.ts`
- `packages/canvas/src/plugins/pen/tx.update-draft.ts`

##### 7. Shape1d lane
- `packages/canvas/src/plugins/shape1d/CONSTANTS.ts`
- `packages/canvas/src/plugins/shape1d/Shape1d.plugin.ts`
- `packages/canvas/src/plugins/shape1d/fn.draft.ts`
- `packages/canvas/src/plugins/shape1d/fx.geometry.ts`
- `packages/canvas/src/plugins/shape1d/fx.node.ts`
- `packages/canvas/src/plugins/shape1d/tx.element.ts`
- `packages/canvas/src/plugins/shape1d/tx.history.ts`
- `packages/canvas/src/plugins/shape1d/tx.render.ts`
- `packages/canvas/src/plugins/shape1d/tx.runtime.ts`

##### 8. Image + transform + group + selection + hydration lanes
###### Image
- `packages/canvas/src/plugins/image/Image.plugin.ts`
- `packages/canvas/src/plugins/image/fn.create-image-element.ts`
- `packages/canvas/src/plugins/image/fn.to-image-element.ts`
- `packages/canvas/src/plugins/image/tx.create-image-clone-drag.ts`
- `packages/canvas/src/plugins/image/tx.insert-image.ts`
- `packages/canvas/src/plugins/image/tx.setup-image-listeners.ts`
- `packages/canvas/src/plugins/image/tx.update-image-node-from-element.ts`

###### Transform
- `packages/canvas/src/plugins/transform/Transform.plugin.ts`
- `packages/canvas/src/plugins/transform/fx.proxy-bounds.ts`
- `packages/canvas/src/plugins/transform/fx.proxy-drag-target.ts`
- `packages/canvas/src/plugins/transform/fx.selection-transform-options.ts`
- `packages/canvas/src/plugins/transform/tx.dispatch-selection-transform-hooks.ts`
- `packages/canvas/src/plugins/transform/tx.finalize-owned-transform.ts`
- `packages/canvas/src/plugins/transform/tx.sync-transformer.ts`

###### Group and selection
- `packages/canvas/src/plugins/group/Group.plugin.ts`
- `packages/canvas/src/plugins/group/fn.get-selection-bounds.ts`
- `packages/canvas/src/plugins/group/fn.scene-node.ts`
- `packages/canvas/src/plugins/group/fn.serialize-subtree-elements.ts`
- `packages/canvas/src/plugins/group/fn.to-group-patch.ts`
- `packages/canvas/src/plugins/group/fx.create-group-boundary.ts`
- `packages/canvas/src/plugins/group/tx.create-group-clone-drag.ts`
- `packages/canvas/src/plugins/group/tx.group-selection.ts`
- `packages/canvas/src/plugins/group/tx.setup-group-node.ts`
- `packages/canvas/src/plugins/group/tx.sync-draggability.ts`
- `packages/canvas/src/plugins/group/tx.sync-group-boundaries.ts`
- `packages/canvas/src/plugins/group/tx.ungroup-selection.ts`
- `packages/canvas/src/plugins/select/Select.plugin.ts`
- `packages/canvas/src/plugins/select/fn.get-selection-path.ts`
- `packages/canvas/src/plugins/select/tx.delete-selection.ts`
- `packages/canvas/src/plugins/select/tx.handle-element-pointer-double-click.ts`
- `packages/canvas/src/plugins/select/tx.handle-element-pointer-down.ts`
- `packages/canvas/src/plugins/select/tx.handle-stage-pointer-move.ts`

###### Hydration and theme-consumer smoke check
- `packages/canvas/src/plugins/scene-hydrator/SceneHydrator.plugin.ts`
- `packages/canvas/src/plugins/grid/Grid.plugin.ts`
- `packages/canvas/src/plugins/visual-debug/VisualDebug.plugin.ts`

##### 9. Existing tests and fixtures to read/update
- `packages/canvas/tests/plugins/selection-style-menu/SelectionStyleMenu.plugin.test.ts`
- `packages/canvas/tests/plugins/text/Text.click-create.plugin.test.ts`
- `packages/canvas/tests/plugins/text/Text.core.plugin.test.ts`
- `packages/canvas/tests/plugins/text/Text.editing.plugin.test.ts`
- `packages/canvas/tests/plugins/text/Text.regressions.plugin.test.ts`
- `packages/canvas/tests/plugins/shape2d/Shape2d.plugin.test.ts`
- `packages/canvas/tests/plugins/shape2d/fn.shape2d-regression.test.ts`
- `packages/canvas/tests/plugins/shape1d/Shape1d.plugin.test.ts`
- `packages/canvas/tests/plugins/pen/Pen.plugin.test.ts`
- `packages/canvas/tests/plugins/image/Image.plugin.test.ts`
- `packages/canvas/tests/plugins/image/tx.update-image-node-from-element.test.ts`
- `packages/canvas/tests/plugins/transform/tx.dispatch-selection-transform-hooks.test.ts`
- `packages/canvas/tests/plugins/transform/tx.sync-transformer.test.ts`
- `packages/canvas/tests/services/crdt/helpers.ts`
- `packages/canvas/tests/services/crdt/txBuilder.element.test.ts`
- `packages/canvas/tests/services/crdt/txBuilder.nested.test.ts`
- `packages/canvas/tests/services/crdt/txBuilder.rollback.test.ts`

#### Implementation order
##### Phase 1. Refactor `@vibecanvas/service-theme`
Files:
- `packages/service-theme/src/types.ts`
- `packages/service-theme/src/styles.ts`
- `packages/service-theme/src/style.shared.ts`
- `packages/service-theme/src/style.light.ts`
- `packages/service-theme/src/style.dark.ts`
- `packages/service-theme/src/style.sepia.ts`
- `packages/service-theme/src/style.graphite.ts`
- `packages/service-theme/src/ThemeService.ts`
- `packages/service-theme/src/index.ts`
- `apps/frontend/src/services/theme.ts`

Goals:
- expand color tokens from `gray` + sparse steps to `base` + full `100..900`
- add token types for `fontSize`, `strokeWidth`, `cornerRadius`
- add per-scope default style maps
- add per-scope remembered manual style maps
- add ThemeService hook(s) for remembered-style change without breaking existing `hooks.change`
- expose runtime resolvers for color, font size, stroke width, corner radius, and stroke dash

##### Phase 2. Change persisted schema
Files:
- `packages/service-automerge/src/types/canvas-doc.zod.ts`
- `packages/service-automerge/src/types/canvas-doc.types.ts`

Goals:
- add `scaleX` / `scaleY` to base element
- replace old style struct with sparse optional tokenized style fields
- remove `borderColor` and `headerColor`
- remove text `fontSize`, `fontSizePreset`, `textAlign`, `verticalAlign`, and `lineHeight` from data
- move align fields into style
- remove dead `radius` fields from shape data if audit confirms they are unused

##### Phase 3. Move remembered style state out of `EditorService`
Files:
- `packages/canvas/src/services/editor/EditorService.ts`
- `packages/canvas/src/runtime.ts`
- `packages/canvas/tests/new-test-setup.ts`

Goals:
- remove editor-owned tool style memory
- keep ThemeService as the only style-memory owner

##### Phase 4. Simplify `CanvasRegistryService` and menu/core flows
Files:
- `packages/canvas/src/services/canvas-registry/CanvasRegistryService.ts`
- `packages/canvas/src/core/fn.selection-style-menu.ts`
- `packages/canvas/src/core/tx.apply-selection-style-change.ts`
- `packages/canvas/src/core/fx.selection-style-element-patch.ts`
- `packages/canvas/src/core/fn.text-style.ts`
- `packages/canvas/src/core/fx.pretext.ts`
- `packages/canvas/src/components/SelectionStyleMenu/*`
- `packages/canvas/src/plugins/selection-style-menu/*`

Goals:
- registry owns support metadata, not style defaults
- ThemeService owns style defaults and remembered style state
- replace `fontSizePreset` flow with `fontSize` token flow
- add `cornerRadius` and `strokeStyle` controls
- keep non-style data controls (`fontFamily`, `lineType`, `startCap`, `endCap`) separate from ThemeService scope

##### Phase 5. Update element lanes to resolve through ThemeService
Shape2d:
- ThemeService resolves fill/stroke/strokeWidth/cornerRadius/opacity/strokeStyle
- single-node resize bakes geometry, grouped/multiselect transform can preserve scale

Text:
- runtime resolves numeric font size from token
- hardcoded line-height constant replaces persisted lineHeight
- transform keeps scale instead of mutating font size

Pen:
- canonical `strokeColor`
- tokenized width via ThemeService
- scale persists on base element

Shape1d:
- canonical `strokeColor`
- dash resolution from `strokeStyle`
- scale persists instead of baking points by default

Image:
- scale persists instead of forced scale reset

##### Phase 6. Update transform / group / select / hydration flows
Files:
- `packages/canvas/src/plugins/transform/*`
- `packages/canvas/src/plugins/group/*`
- `packages/canvas/src/plugins/select/*`
- `packages/canvas/src/plugins/scene-hydrator/SceneHydrator.plugin.ts`

Goals:
- base fallback transform persistence writes `scaleX` / `scaleY`
- element-owned transforms stop collapsing scale into text font size or image size unless explicitly geometry-baked
- group boundary and selection bounds stay correct for scaled nodes
- clone and hydration flows preserve scale fields

##### Phase 7. Clean up stale helpers and update tests
Goals:
- delete `fontSizePreset` remnants
- delete stroke-color fallback helpers that exist only because stroke-only elements abuse `backgroundColor`
- update all `@gray/*` expectations to `@base/*`
- update tests that currently assert `EditorService` style memory
- add regression coverage for:
  - ThemeService remembered style per scope
  - theme-switch re-resolution of tokenized element styles
  - text transform preserving scale instead of mutating font size
  - shape2d geometry vs scale split
  - image / pen / shape1d scale persistence

#### Validation checklist
- [ ] Typecheck `packages/service-theme` changes.
- [ ] Typecheck `packages/service-automerge` changes.
- [ ] Typecheck `packages/canvas` changes.
- [ ] Run targeted selection-style menu tests.
- [ ] Run targeted text tests.
- [ ] Run targeted shape2d tests.
- [ ] Run targeted shape1d tests.
- [ ] Run targeted pen tests.
- [ ] Run targeted image tests.
- [ ] Run targeted transform tests.
- [ ] Run CRDT helper/rollback tests.

#### Notes
- Current token support in `service-theme` is narrower than real test usage. Existing tests already mention tokens like `@red/600`, so expanding to full `100..900` is aligned with current repo pressure.
- Existing code and tests still rely on `@gray/*`; no backward compatibility means update them all to `@base/*` in one pass.
- Do not change the meaning of existing `theme.hooks.change`; add new hook(s) for remembered-style changes instead.
- Local UI state like “expanded color panel open/closed” can stay in the component layer. The source-of-truth requirement is about style state, not every popup boolean.

## S ubtractions
- [ ]: [S1](s/S1.md) - double bun run dev -> find new port
- [x]: [S2](s/S2.md) - rename CLAUDE.md -> AGENTS.md
- [x]: [S3](s/S3.md) - ci: introduce release branches, from main to deploy
- [x]: [S4](s/S4.md) - when hand tool (space pressed) must allow to move over chat too
- [x]: [S5](s/S5.md) - remove agent_logs table and just rely on opencode sessions
- [x]: [S6](s/S6.md) - remove chat.title
- [x]: [S7](s/S7.md) - use http in orpc
- [x]: [S9](s/S9.md) - fix seo image of web
- [x]: [S10](s/S10.md) - reverse websocket to orpc
- [x]: [S12](s/S12.md) - refactor: konvajs
- [x]: [S13](s/S13.md) - canvas plugins: folder-per-plugin refactor plan
- [x]: [S14](s/S14.md) - canvas: keep recorder plugin in development only
- [x]: [S15] - inline text support -> fix position (use pretext lib?)
- [x]: [S16](s/S16.md) - canvas: fix broken TypeScript typings in packages/canvas
- [x]: [S17](s/S17.md) - extract apps/server into apps/cli + shared packages
- [x]: [S18](s/S18.md) - cli server: migrate http file/static/spa serving from apps/server
- [x]: [S19](s/S19.md) - cli orpc: expose db events stream and remove apps/server api.db
- [x]: [S20](s/S20.md) - cli server: restore compiled-mode port fallback when preferred port is busy
- [x]: [S21] remove apps/server and packages/functional-core and shell
- [x]: [S22] fix build and ci tests to use new apps/cli
- [x]: [S23] Use global costs for dev and prod ports
- [x]: [S24] rename @vibecanvas/service-db -> @vibecanvas/service.db and co
- [x]: [S25](s/S25.md) - db: remove filetrees table/schema; canvas-doc fully owns filetree state
- [x]: [S26](s/S26.md) - db: add filesystems db table for local/remote machine identity
- [x]: [S27](s/S27.md) - canvas CLI: remove unimplemented `render` command and help traces
- [x]: [S28](s/S28.md) - use runtime package in canvas, like cli does
- [x]: [S29](s/S29.md) - canvas: add debug config via localstorage for each plugin and service
- [x]: [S30](s/S30.md) - canvas: remove remaining Tailwind-style classes from component TSX
- [x]: [S31](s/S31.md) - frontend: remove remaining Tailwind-pattern source from app UI
- [x]: [S31] - how to deal with /Users/omarezzat/Workspace/vibecanvas/vibecanvas/packages/canvas/src/core/pretext.ts
- [x]: [S32] - show stylemenu already in create mode when tool like rect,pen is pressed. ux -> user knows where to draw
- [x]: [S33] - canvas architecture: rename SceneService -> SceneService and split EditorService so editor keeps only edit/transform state while scene registries/mapping move to SceneService
- [x]: [S34] - test canvas/core if all fn fx file function are correct
- [x]: [S35](s/S35.md) - canvas/core: align fn fx tx file boundaries, injected portals, and callers
- [x]: [S36](s/S36.md) - transform ownership: plugin only renders/dispatches; element plugins own drag + crdt

## E xplorations
- [ ]: [E1](e/E1.md) - Tauri Research
- [ ]: [E5](e/E5.md) - how to implement state machine system?
- [ ]: [E6](e/E6.md) - should we include a task management
- [x]: [E8](e/E8.md) - canvas CLI: query/edit surface exploration
- [ ]: [E9] - tmux for persistant pty sessions
- [ ]: [E10] - headless chrome to stream to canvas
- [ ]: [E11] - https://github.com/cr0hn/dockerscan
- [ ]: [E12] - https://github.com/superradcompany/microsandbox
- [x]: [E13](e/E13.md) - Research Pluginsystem for server
- [x]: [E14] - do we need packages/functional-core
- [x]: [E15](e/E15.md) - canvas UI extensions: sideloadable community widgets and ArrowJS exploration
- [x]: [E16] - filewatch performance. -> on big folders are slow
- [ ]: [E17](e/E17.md) - automerge authority: optimistic local writes with server validation/reject path
- [ ]: [E18] - replace iframe with bun.webview??
- [ ]: [E19](e/E19.md) - canvas performance longterm: worker automerge + incremental notifications
- [x]: [E20](e/E20.md) - improvement crdt updates

## D irections
- [x]: [D1] - AI can edit the canvas directly
- [x]: [D2] - Server plugin system
- [x]: [D3] - Support pluggable filsystem architecture
- [~]: [D4] - Support sideloadable ui elements
- [ ]: [D5] - AI Canvas Element, attachable to other elements
- [ ]: [D6] - Gateway support
- [ ]: [D7] - Auth support

## Pragmatic Code Style

Long code line for lookup / easy parts.
Short code line for complex parts.
If in doubt, use long code line.

early exit > if else

Comment on complex parts.
You change code, you change comments.

pure fn > fn > static class > class

fn with side effects should have suffix ...Fx

locality of behavior, don't make me jump around

minimize redirections

dry is bad, make longer functions

factor out logic only if repeated 5 times or more
factor out only if really same logic

move types if shared into local types.ts file

types dont contain understanding, only structure, it's boilerplate, move out of sight

2 spaces for indentation
