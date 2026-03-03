# LSP Support Plan

## Goal
Add Language Server Protocol (LSP) support to the VibeCanvas code editor (`CodeEditor`) for features like autocomplete, hover, and diagnostics. This builds upon the existing file widget implementation.

## Architecture

### Server-Side (`@vibecanvas/server`)
- **LSP Service (source of truth)**: A new backend service (`src/lsp/srv.lsp.ts`) owns all LSP intelligence: server registry, nearest-root detection, lazy install, spawn, stdio framing, and lifecycle.
- **Shared WebSocket Multiplexing**: Piggyback on existing `/api` WebSocket. LSP messages are logical channels over the same socket, not dedicated `/lsp/*` upgrades.
- **Session Pooling**: Keep warm LSP sessions keyed by `(language, projectRoot)`, attach/detach logical LSP clients, and shutdown on idle timeout.

### Client-Side (`@vibecanvas/spa`)
- **LSP Transport**: A custom `Transport` implementation (`lsp-transport.ts`) that wraps the browser WebSocket to match `@codemirror/lsp-client`'s interface.
- **LSP Manager**: A thin singleton manager (`lsp-manager.ts`) that maintains browser `LSPClient` instances and delegates root/server concerns to backend.
- **CodeEditor Integration**: Wire the `LSPClient` into the CodeMirror editor instance via `client.plugin(fileUri)`.

## Implementation Tasks

### 1. Server Implementation
- [ ] **Dependencies**: Add `typescript-language-server` and `pyright` to `apps/server/package.json`.
- [ ] **LSP Service** (`apps/server/src/lsp/srv.lsp.ts`):
    - Implement server registry for supported languages (`typescript`, `python` initially).
    - Implement nearest-root finder (marker-based upward search) per server.
    - Implement lazy install strategy for missing runtimes (env-guarded disable flag).
    - Implement message framing (Content-Length headers) for stdio <-> JSON-RPC bridging.
    - Implement pooled sessions keyed by `(language, projectRoot)` with ref-count + idle-timeout shutdown.
    - Implement logical client attach/detach over shared `/api` transport.
    - Implement JSON-RPC request ID remapping so multiple logical clients can share one backend process safely.
- [ ] **API Handler** (`apps/server/src/apis/api.lsp.ts`):
    - Implement handlers for logical LSP channel messages over `/api` (open/send/close).
    - Route per-client messages into pooled backend sessions.
    - Ensure websocket close detaches all logical LSP clients belonging to that socket/request context.

### 2. Client Infrastructure
- [ ] **Utilities**:
    - Update `apps/spa/src/features/file-widget/util/ext-to-language.ts` to include `getLanguageId(path)` helper (mapping ext -> 'typescript', 'python', etc.).
- [ ] **Transport** (`apps/spa/src/features/file-widget/util/lsp-transport.ts`):
    - Implement `Transport` interface from `@codemirror/lsp-client`.
    - Handle WebSocket connection state (queue messages until open).
- [ ] **Manager** (`apps/spa/src/features/file-widget/util/lsp-manager.ts`):
    - Manage browser `LSPClient` instances and websocket transports.
    - Key reuse by language + backend root hint inputs where relevant.
    - Handle reconnection logic.

### 3. CodeEditor Integration
- [ ] **Update `CodeEditor`** (`apps/spa/src/features/file-widget/components/viewers/code-editor.tsx`):
    - Use `getLspExtensions` from manager.
    - Add `client.plugin(uri)` to CodeMirror extensions.
    - Reconfigure LSP plugin when `path` changes.

## File Changes

### New Files
- `apps/server/src/lsp/srv.lsp.ts`
- `apps/server/src/lsp/srv.lsp-server-registry.ts`
- `apps/server/src/apis/api.lsp.ts`
- `apps/spa/src/features/file-widget/util/lsp-transport.ts`
- `apps/spa/src/features/file-widget/util/lsp-manager.ts`

### Modified Files
- `apps/server/package.json` (deps)
- `apps/spa/src/features/file-widget/util/ext-to-language.ts`
- `apps/spa/src/features/file-widget/components/viewers/code-editor.tsx`

## Verification
- Build server and SPA.
- Open a `.ts` file: verify autocomplete and hover work.
- Open a `.py` file: verify autocomplete works.
- Check server logs for LSP process spawning.
- Open/close editor repeatedly: verify warm reuse and idle-timeout shutdown behavior.

## Progress

- 2026-03-03: Read `lsp-guide.md` and aligned implementation direction with OpenCode-style backend behavior.
- 2026-03-03: Decided to keep lazy install + project root detection entirely in backend service layer (server-side registry + root finder + spawn manager), with websocket API layer acting as thin pass-through.
- 2026-03-03: Captured lifecycle strategy: keep LSP servers warm per `(language, projectRoot)` while clients are active; use idle-timeout shutdown to balance latency vs resource usage.
- 2026-03-03: Started implementation step 1 (server dependencies + LSP proxy/service wiring).
- 2026-03-03: Renamed planned service from `srv.lsp-proxy.ts` to `srv.lsp.ts`.
- 2026-03-03: Updated architecture to use logical LSP channels over existing `/api` websocket (no dedicated `/lsp/*` upgrades).
- 2026-03-03: Clarified that websocket connection lifecycle is separate from LSP session lifecycle; service tracks logical clients and pooled server sessions independently.
- 2026-03-03: Started investigation of OpenCode LSP implementation reuse at `/Users/omarezzat/Workspace/opencode/packages/opencode/src/lsp`.
- 2026-03-03: Investigation currently blocked by workspace external-directory read restrictions; waiting for user to provide access or paste files.
- 2026-03-03: Reviewed OpenCode `lsp/index.ts`, `lsp/server.ts`, and `lsp/language.ts` (pasted by user) for reuse feasibility.
- 2026-03-03: Reuse decision: adopt `LSPServer.Info`-style registry + nearest-root + lazy-install patterns; do not reuse OpenCode's `LSP` facade directly because Vibecanvas uses shared `/api` websocket logical channels instead of direct in-process request methods.
- 2026-03-03: Integration note: Vibecanvas must add JSON-RPC ID remapping + per-logical-client routing layer on top of reusable server spawn/root logic from OpenCode.
- 2026-03-03: Started pair-programming implementation for `packages/imperative-shell/src/lsp/srv.lsp.ts` with class/interface skeleton (public API + method stubs).
- 2026-03-03: Added `LspService` skeleton to `packages/imperative-shell/src/lsp/srv.lsp.ts` including public types/interfaces (`TLspLanguage`, client refs, open/message/outbound/session snapshot), method stubs, and small helper implementations (`listSessions`, key builders, outbound sender setter).
- 2026-03-03: Captured implementation TODO anchors directly in methods for next steps: session pooling, root/server resolution, logical attach/detach, request-id remapping, and graceful shutdown.
- 2026-03-03: Pairing follow-up: documenting which fields are protocol-owned vs app-owned in LSP service interfaces to prevent accidental mutation of JSON-RPC/LSP keys.
- 2026-03-03: Added inline comments in `srv.lsp.ts` clarifying protocol ownership: `requestId`, `clientId`, and `rootHint` are app-level keys; only `message` contains JSON-RPC/LSP protocol keys (`jsonrpc`, `id`, `method`, `params`, `result`, `error`) and must be preserved aside from controlled ID remapping.
- 2026-03-03: Implemented `openChannel` step 1 input validation in `srv.lsp.ts` (`requestId`, `clientId`, `filePath`, and supported-language guard) via `validateOpenChannelArgs`.
- 2026-03-03: Implemented `openChannel` step 2 idempotency behavior in `srv.lsp.ts`: existing `(requestId, clientId)` attachment now no-ops when target is unchanged, or detaches previous attachment/session membership when target changed.
- 2026-03-03: Implemented `openChannel` step 3 root resolution in `srv.lsp.ts` via `resolveProjectRoot`: normalize absolute paths, accept `rootHint` only when it contains `filePath`, otherwise fallback to `dirname(filePath)`.
- 2026-03-03: Added reusable top-level `NearestRoot` function and `TLspServerInfo` registry in `srv.lsp.ts` (`LspServerInfoByLanguage`) for initial `typescript` and `python` server definitions.
- 2026-03-03: Wired `resolveProjectRoot` to use registry-driven `root(filePath, stopDirectory)` detection with `rootHint` validation override, replacing pure `dirname` fallback logic.
- 2026-03-03: Refactored server registry to sibling file `packages/imperative-shell/src/lsp/srv.lsp-server-info.ts`; moved `LspServerInfoByLanguage` (and related root/server type helpers) out of `srv.lsp.ts` and imported it back into service.
- 2026-03-03: Added focused LSP unit tests:
  - `packages/imperative-shell/src/lsp/srv.lsp.test.ts` for open-channel idempotency and root-resolution behavior.
  - `packages/imperative-shell/src/lsp/srv.lsp-server-info.test.ts` for `NearestRoot` include/exclude/stop-boundary behavior.
- 2026-03-03: Verified new tests pass with `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (7 pass, 0 fail).
- 2026-03-03: Implemented all previously stubbed methods in `packages/imperative-shell/src/lsp/srv.lsp.ts`:
  - `openChannel`: validate, idempotency, resolve root, create/reuse session, attach client, emit opened event.
  - `handleClientMessage`: locate attachment/session, remap request IDs, frame and forward to LSP stdin.
  - `closeChannel` + `closeAllForRequest`: detach clients, cleanup request mappings, idle-timeout session shutdown.
  - `shutdown`: destroy all sessions and clear state maps.
- 2026-03-03: Added stdio framing/routing internals to `srv.lsp.ts`: Content-Length writer, stdout frame parser, response id unmapping, and broadcast fallback for non-mapped server messages.
- 2026-03-03: Re-verified LSP tests after full service implementation with `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (7 pass, 0 fail).
- 2026-03-03: Adjusted LSP auto-install strategy in `srv.lsp-server-info.ts` to install missing Node-based servers into `vibecanvasDirectory` (workspace-local `node_modules`) when not found globally.
- 2026-03-03: Updated `TLspServerInfo.spawn` signature to receive `installDirectory` and wired `srv.lsp.ts` session creation to pass service `vibecanvasDirectory`.
- 2026-03-03: Added env guard `VIBECANVAS_DISABLE_LSP_DOWNLOAD` for lazy install opt-out; re-ran `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (7 pass, 0 fail).
- 2026-03-03: Added critical service tests in `packages/imperative-shell/src/lsp/srv.lsp.test.ts`:
  - session reuse + attach count (single spawn for multiple logical clients on same root)
  - JSON-RPC request/response id remap round-trip
  - `closeAllForRequest` isolation across different request IDs
- 2026-03-03: Re-ran LSP test suite after new cases: `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (10 pass, 0 fail).
- 2026-03-03: Started server-registry refactor to support the full language list by splitting server definitions into `packages/imperative-shell/src/lsp/server-info/lsp.*.ts` files and composing them from `srv.lsp-server-info.ts`.
- 2026-03-03: Completed server-info split:
  - Added `packages/imperative-shell/src/lsp/server-info/lsp.shared.ts` (shared types + `NearestRoot` + local Node install helpers).
  - Added per-language modules under `packages/imperative-shell/src/lsp/server-info/` (deno/typescript/python/vue/eslint/oxlint/biome/gopls/ruby-lsp/ty/elixir-ls/zls/csharp/fsharp/sourcekit-lsp/rust/clangd/svelte/astro/jdtls/kotlin-ls/yaml-ls/lua-ls/php-intelephense/prisma/dart/ocaml-lsp/bash/terraform/texlab/dockerfile/gleam/clojure-lsp/nixd/tinymist/haskell-language-server/julials).
  - Rebuilt `packages/imperative-shell/src/lsp/srv.lsp-server-info.ts` as a thin aggregator importing each language module one-by-one.
- 2026-03-03: Updated install behavior to prefer global binaries, then install/use workspace-local binaries in `vibecanvasDirectory` for Node-based servers via shared helpers.
- 2026-03-03: Re-ran LSP tests after refactor: `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (10 pass, 0 fail).
- 2026-03-03: Wired server-side extension/language inference via `packages/imperative-shell/src/lsp/language.ts`:
  - Added `resolveLspLanguageFromPath(filePath)` in `srv.lsp-server-info.ts`.
  - Added mapping from generic language keys to internal LSP server IDs.
  - Updated `LspService.openChannel` to normalize incoming language by file-path inference before validation/attach flow.
- 2026-03-03: Re-ran LSP tests after language inference integration: `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (10 pass, 0 fail).
- 2026-03-03: Added new core contract `packages/core-contract/src/lsp.contract.ts` with minimal passthrough RPC surface (`open`, `send`, `close`, `events`) and raw JSON-RPC message transport (`message: string`).
- 2026-03-03: Registered `lsp` in `packages/core-contract/src/index.ts` (imports, exports, router wiring).
- 2026-03-03: Added server API implementation `apps/server/src/apis/api.lsp.ts`:
  - thin handlers for `open/send/close/events`
  - request-scoped event publisher bridging `LspService` outbound messages to contract events
  - request-close cleanup helper `closeLspChannelsForRequest`.
- 2026-03-03: Wired `lsp` API into `apps/server/src/api-router.ts` and request-close cleanup into `apps/server/src/server.ts` `/api` websocket close path.
- 2026-03-03: Verified tests after contract/API changes:
  - `bun test ./packages/imperative-shell/src/lsp/*.test.ts` (10 pass, 0 fail)
  - `bun --filter @vibecanvas/server test` (12 pass, 0 fail)
- 2026-03-03: Started SPA-side integration by adding an LSP manager service under `apps/spa/src/services/` and aligning language inference with shared `packages/imperative-shell/src/lsp/language.ts` mappings.
- 2026-03-03: Aligned SPA manager with required contract language field: `openChannel` now requires successful language inference from shared `language.ts` mapping and returns `false` when no mapping exists.
- 2026-03-03: Refined SPA manager language typing to derive `TLspServerLanguage` from `LANGUAGE_TO_LSP` values (removed manual union maintenance) and re-verified SPA build (`bun --filter @vibecanvas/spa build` success).
- 2026-03-03: Fixed SPA TypeScript index access error in `lsp-manager.ts` by adding a type guard (`hasLanguageMapping`) before indexing `LANGUAGE_TO_LSP` with inferred language keys.
- 2026-03-03: Starting end-to-end SPA CodeMirror integration step (transport adapter + manager wiring + `CodeEditor` plugin lifecycle).
- 2026-03-03: Added CodeMirror transport adapter `apps/spa/src/services/lsp-transport.ts` implementing `@codemirror/lsp-client` `Transport` via `lspManagerService` send/subscribe routing.
- 2026-03-03: Updated `apps/spa/src/features/file-widget/util/ext-to-language.ts` with `getLanguageId(path)` using shared `@vibecanvas/shell/lsp/language` extension map.
- 2026-03-03: Wired `apps/spa/src/features/file-widget/components/viewers/code-editor.tsx` to LSP lifecycle:
  - per-file channel open/close via manager
  - `LSPClient` connect/disconnect via new transport
  - dynamic plugin reconfigure in a dedicated CodeMirror compartment on path/truncated changes
  - cleanup safety for async path-switch races.
- 2026-03-03: Verified SPA build after full editor wiring with `bun --filter @vibecanvas/spa build` (success).
- 2026-03-03: Added architecture spec `specs/spec.lsp.md` (overview, requirements, contracts, backend/SPA implementation, lifecycle, file map, and data-flow diagrams).
- 2026-03-03: Added targeted LSP debug logging to aid backend-vs-frontend triage (WebSocket tab too noisy):
  - SPA manager logs in `apps/spa/src/services/lsp-manager.ts` (`open/send/close`, event stream start/stop, event payloads).
  - SPA transport logs in `apps/spa/src/services/lsp-transport.ts` (send/recv subscribe lifecycle).
  - Code editor lifecycle logs in `apps/spa/src/features/file-widget/components/viewers/code-editor.tsx` (channel open/connected/cleanup and stale setup guards).
  - Server API logs in `apps/server/src/apis/api.lsp.ts` (open/send/close/events and outbound payload previews).
- 2026-03-03: Re-verified after logging additions:
  - `bun --filter @vibecanvas/server test` (12 pass, 0 fail)
  - `bun --filter @vibecanvas/spa build` (success)
- 2026-03-03: Started authoring `specs/spec.lsp.md` to document end-to-end LSP architecture, contracts, lifecycle, and file map.
