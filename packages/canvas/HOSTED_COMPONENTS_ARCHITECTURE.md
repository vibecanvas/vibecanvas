# Hosted components architecture

## Goal

Run hosted widget UI as untrusted Arrow sandbox code.

Keep canvas behavior trusted.

Trusted host owns:
- Konva node creation
- drag
- transform
- focus
- DOM projection
- z-order
- CRDT sync
- capability access control

Sandbox owns:
- widget UI
- widget local state
- user interaction inside allowed bridge surface

## New shape

Replace split hosted widget path with one trusted host path:

- `ArrowJsService`
- `HostedComponentsService`
- `HostedComponentPlugin`

## Why change

Today hosted UI is split across:
- `HostedSolidWidgetPlugin`
- `IframeBrowserWidgetPlugin`
- `ArrowJsPlugin`

This causes overlap in:
- mount lifecycle
- DOM projection
- drag handling
- focus gating
- z-order sync
- reload/remount rules
- capability wiring

Need one system.

## Services

### `ArrowJsService`

Owns sandbox runtime details.

Responsibilities:
- validate hosted component bundle shape before mount
- create Arrow sandbox instance from bundle source
- mount sandbox into trusted host DOM element
- unmount sandbox
- remount sandbox after provider change or reload action
- cache parsed bundle data when useful
- wire bridge modules based on manifest permissions
- surface load/render/runtime errors as trusted host state

Inputs:
- hosted component bundle
- mount element
- bridge factory result
- optional output/error handlers

Outputs:
- mounted sandbox handle
- status updates: `idle | mounting | mounted | error`
- error payload for host UI

Non-goals:
- no canvas selection logic
- no Konva node ownership
- no CRDT writes directly

### `HostedComponentsService`

Owns provider registry and resolution.

Responsibilities:
- register builtin providers by slot
- register remote providers by slot
- register user overrides by slot
- resolve final provider for one hosted element
- notify mounts when provider resolution changes
- hold remote package metadata and cache state

Resolution order:
1. element renderer override
2. user slot override
3. builtin slot provider

Responsibilities not owned here:
- no DOM mount work
- no Konva work
- no sandbox rendering work

### `HostedComponentPlugin`

Owns trusted canvas host behavior.

Responsibilities:
- create invisible Konva host rect for hosted elements
- hydrate hosted elements from CRDT
- serialize hosted rect back to CRDT
- mount trusted DOM wrapper per hosted element
- ask `HostedComponentsService` for resolved provider
- ask `ArrowJsService` to mount sandbox UI into wrapper
- project world bounds to screen bounds
- manage pointer-events gate based on selection/focus/transform mode
- manage DOM-header drag path
- manage z-order sync with canvas render order
- manage reload/remove/open actions owned by host shell
- manage trusted drop listeners and bridge drop queue

Non-goals:
- no direct knowledge of widget internals
- no package-specific filetree/file/terminal UI code

## Bridge model

Sandbox never gets raw app services.

Bridge modules are permission-gated.

Planned bridge groups:
- `host:vibecanvas/component`
- `host:vibecanvas/drop`
- `host:vibecanvas/filetree`
- `host:vibecanvas/file`
- `host:vibecanvas/terminal`

Important rule:
- app capabilities stay in trusted host
- sandbox only gets narrow async bridge functions
- args and return values must be serializable plain data

## Mount flow

1. CRDT element hydrates into hosted Konva rect
2. `HostedComponentPlugin` creates trusted mount wrapper in `worldWidgetsRoot`
3. plugin resolves provider through `HostedComponentsService`
4. plugin builds allowed bridge modules for that provider
5. plugin asks `ArrowJsService` to mount sandbox bundle
6. plugin keeps wrapper projected to screen space during drag, transform, and camera changes
7. plugin remounts sandbox when provider or reload state changes

## Replacement map

### Old `HostedSolidWidgetPlugin`

Move out package-specific UI ownership.

Keep in new host path:
- host rect creation
- drag and transform sync
- focus gating
- DOM projection
- drop routing
- CRDT serialization
- selection integration
- shell chrome owned by trusted host

Remove from plugin:
- direct Solid imports of filetree/file/terminal widget bodies
- package-specific widget mount branching by element type

### Old `IframeBrowserWidgetPlugin`

Merge shared host behavior into new hosted component path.

Keep in new host path:
- host rect creation
- projection
- selection/focus gating
- drag and transform sync
- z-order sync
- remove/reload actions

Remove from plugin:
- iframe-specific UI mount logic
- dedicated duplicated mount record type when generic hosted component record can work

### Old `ArrowJsPlugin`

Do not keep as free-standing canvas plugin.

Split its useful part into `ArrowJsService`:
- bundle -> sandbox mount
- error handling
- bridge wiring

Delete throwaway demo behavior:
- ad hoc root on `document.body`
- hardcoded red box
- hardcoded source inline demo

## Package boundary plan

Shared contract package:
- `packages/ui` -> `@vibecanvas/ui`

Official hosted component packages:
- `packages/hosted-component-filetree`
- `packages/hosted-component-file`
- `packages/hosted-component-terminal`
- `packages/hosted-component-iframe`

Each official package ships one provider bundle.

Builtin and remote providers must use same bundle contract.

## Migration order

1. land shared contract in `@vibecanvas/ui`
2. land architecture path in canvas docs
3. implement `HostedComponentsService`
4. implement `ArrowJsService`
5. implement `HostedComponentPlugin`
6. migrate `filetree`
7. migrate `file`
8. migrate `iframe`
9. migrate `terminal`
10. remove old plugin split after parity proven
