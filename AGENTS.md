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