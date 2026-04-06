Monorepo Vibecanvas:

apps/frontend -> solidjs spa, renders webpage
apps/web -> github pages, marketing website
apps/server -> bun server
apps/vibecanvas -> installable binary for npm package

packages/canvas -> canvas core logic, konvajs, automerge
packages/core-contract -> orpc api design, websocket first
packages/functional-core -> shared logic, types, utils
packages/imperative-shell -> stateful services, db, crdt, pty, fs

We use @tasks/BASED.md to manage our work.

Notes:
- Root `package.json` has a `postinstall` hook for `scripts/patch-automerge-repo-throttle.mjs`.
- Script patches installed `@automerge/automerge-repo` throttle helpers under `node_modules/.bun`.
- Patch clamps negative timeout delays with `Math.max(0, wait)`.
- Reason: upstream package can emit `TimeoutNegativeWarning` in dev/runtime.
- Do not remove unless upstream fix is verified and hook is removed on purpose.