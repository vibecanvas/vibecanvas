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

## Functional Core Directive

We want as much code as possible to be simple functions.

Goal:
- separate logic from state
- keep business rules in small boring functions
- push mutable state and side effects to edges
- make code easier to test, move, and reuse

Folder rule:
- agent should try to maintain a `/core` folder in every package
- put functions and logic-first code in that `/core` folder
- if package structure needs it, `/core` may live inside a subfolder instead
- only do nested `/core` folders when complexity is high and locality is better

Bias:
- prefer moving logic into `/core` instead of leaving it mixed with UI, services, transport, or stateful code
- prefer simple functions over classes and hidden state
- if unsure, choose simpler split: state outside, logic inside `/core`

## File Type Rules

Print and follow these rules when working on function files.
Do not guess. Use these rules.

### fn.*.ts
- ignore `fn.*.test.ts` files
- exported functions must start with `fx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, or `tx.`
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- fn is for pure functions
- keep fn logic deterministic and state-free

### Direct runtime global blocking
- block free runtime global usage like `crypto.randomUUID()`, `window.location`, `fetch(...)`, `process.env`, `console.log(...)`
- allow type-only references like `typeof crypto`, `typeof window`, `Request`, `Response` when they are only used in type positions
- allow injected access like `portal.crypto.randomUUID()` and `portal.window.location`
- allow portal field typing like `crypto: typeof crypto` and `window: typeof window`
- rule is about direct runtime global access, not about naming a portal field or using the global in a type-only annotation

### fx.*.ts
- ignore `fx.*.test.ts` files
- exported functions must start with `fx`
- imports must be type-only unless imported module leaf starts with `fn.` or `fx.`
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- every `fx*` function must have exactly 2 params
- first param must be named `portal` and typed as `TPortal*`
- second param must be named `args` and typed as `TArgs*`
- `TPortal` may hold side effects and mutable services objects
- `TArgs` is usually serializable payload data
- fx is for impure reads; use brain and prefer tx for impure writes

### tx.*.ts
- ignore `tx.*.test.ts` files
- exported functions must start with `tx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, or `tx.`
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- every `tx*` function must have exactly 2 params
- first param must be named `portal` and typed as `TPortal*`
- second param must be named `args` and typed as `TArgs*`
- `TPortal` may hold side effects and mutable services objects
- `TArgs` is usually serializable payload data
- tx is for impure writes; use brain and prefer tx when code changes external world state
- tx may runtime-import `fn.*`, `fx.*`, and `tx.*` helpers
