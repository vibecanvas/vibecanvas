# @vibecanvas/ui-example

Simple hosted UI example.

Files:
- `src/main.ts`
- `src/UserName.ts`
- `src/UserCard.ts`
- `src/main.css`
- `vibecanvas.manifest.ts`

This package is source-first.

Host should:
- read files under `src/`
- build `source: Record<string, string>`
- call `prepareVibecanvasSandboxSource()` from `@vibecanvas/ui`
- pass result to `sandbox({ source })`
