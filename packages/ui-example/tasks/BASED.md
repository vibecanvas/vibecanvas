# BASED

## TODO

- [ ] Decide fate of `TEditorTool.group` in `packages/canvas/src/new-services/editor/EditorService.ts`.
  - Verify no runtime usage outside type definition.
  - Choose one path:
    - remove dead field from `TEditorTool`, or
    - implement real toolbar grouping behavior and document semantics.
  - If kept, add one consumer and small test/proof of use.
