# Canvas Package Guide

Start with `specs/spec.canvas.md`.

This package is a Konva canvas runtime with a thin Solid host, a `CanvasService` kernel, and plugin-owned behavior.

Rough guidance:

- keep `src/components/Canvas.tsx` thin; it should load the Automerge doc and mount `CanvasService`
- put shared runtime concerns in `src/services/canvas/Canvas.service.ts`
- put feature behavior in plugins under `src/plugins/`
- treat `staticBackgroundLayer`, `staticForegroundLayer`, and `dynamicLayer` as distinct responsibilities
- use `context.capabilities` for shape/group factories and serialization boundaries
- keep document writes behind `src/services/canvas/Crdt.ts`
- add or update tests in `packages/canvas/tests` for behavior changes

Current reality:

- startup scene hydration is document-backed via `SceneHydratorPlugin`
- grouping, selection depth, transforms, and undo/redo are actively tested
- rectangle workflows are the most complete; many toolbar tools are still placeholders
