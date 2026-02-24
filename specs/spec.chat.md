# Chat Fullstack Spec (OpenCode + Canvas Widget)

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Current Assumptions and Constraints](#current-assumptions-and-constraints)
4. [End-to-End User Flow](#end-to-end-user-flow)
5. [Contracts and Data Shapes](#contracts-and-data-shapes)
6. [Backend Implementation](#backend-implementation)
7. [SPA Implementation](#spa-implementation)
8. [Composer, Autocomplete, and Drag-Drop](#composer-autocomplete-and-drag-drop)
9. [Dialog Menu and Slash Command System](#dialog-menu-and-slash-command-system)
10. [State and Sync Lifecycle](#state-and-sync-lifecycle)
11. [Error Handling](#error-handling)
12. [Performance and UX Notes](#performance-and-ux-notes)
13. [Testing and Verification](#testing-and-verification)
14. [File Map](#file-map)
15. [Data Flow Diagram](#data-flow-diagram)

## Overview

Chat is a CRDT-backed canvas widget that embeds an OpenCode session UI directly into the drawing surface.

Architecture summary:

- Geometry and transforms (`x/y/w/h/angle/scale`) live in the Automerge canvas doc as `elements[id].data.type = "chat"`.
- Persistent metadata (`title`, `session_id`, `local_path`, `canvas_id`) lives in SQLite `chats`.
- Message history snapshots live in SQLite `agent_logs` (`info + parts`).
- Live runtime behavior comes from OpenCode SDK streams and RPC calls under `api.opencode.*`.
- Composer is ProseMirror-based and supports text, pasted images, slash commands, `@` path mentions, and filetree drag-drop.

The design is hybrid local-first: CRDT handles visual placement/collaboration, while chat runtime and transcripts are persisted and streamed through server APIs.

## Requirements

- Users can create a chat widget from toolbar tool `chat`.
- Chat widgets support standard canvas interactions: select, move, resize, rotate, clone, delete.
- Creating a chat must create:
  - OpenCode session (`session_id`),
  - `chats` row,
  - CRDT chat element.
- Chat input supports:
  - Enter send,
  - Shift+Enter newline,
  - image paste -> file parts,
  - `/` command autocomplete,
  - `@` file/directory autocomplete,
  - filetree drag-drop mention insertion with path-scope validation.
- Sending a prompt uses structured parts against `api.opencode.prompt`.
- Live updates come from `api.opencode.events` and are applied incrementally.
- History rehydrates from `agent-logs.getBySession`.
- Changing folder path creates a new chat/session near current widget (does not mutate existing chat session path).

## Current Assumptions and Constraints

- Chat rows are globally mirrored by canvas in `store.chatSlice.backendChats[canvasId]`.
- Message/part graph is widget-local state in `createChatContextLogic`, not in global store.
- Events stream is directory-based on the server side; client filters by `sessionID` to isolate the active chat session.
- Slash command autocomplete lists more commands than currently implemented behavior (some commands show "not implemented" toast).
- Chat delete applies CRDT removal immediately; backend delete is asynchronous best effort.

## End-to-End User Flow

1. User selects `chat` tool and clicks canvas.
2. SPA `cmd.draw-new` calls `api.chat.create({ canvas_id, x, y, title, local_path })`.
3. Server `ctrlCreateChat` validates canvas, creates OpenCode session, inserts chat row, writes CRDT element.
4. Chat renderable mounts DOM overlay and renders `Chat` component.
5. `Chat` context loads prior logs and available agents, then subscribes to `api.opencode.events`.
6. User composes via ProseMirror (`text` + optional `file` parts), optionally using `@` suggestions or drag-drop.
7. On send, UI inserts optimistic user message and calls `api.opencode.prompt`.
8. Stream events (`message.updated`, `message.part.updated/delta`, `session.status`, `session.idle`) reconcile optimistic state and drive status line.
9. User can run slash actions (copy transcript, init context, open agents menu), switch folder (new chat), or delete widget.

## Contracts and Data Shapes

### Database (`packages/imperative-shell/src/database/schema.ts`)

```ts
type TChatRow = {
  id: string;
  canvas_id: string;
  title: string;
  session_id: string;
  local_path: string;
  created_at: Date;
  updated_at: Date;
};

type TAgentLogRow = {
  id: string;
  canvas_id: string;
  session_id: string;
  timestamp: Date;
  data: {
    info: Message;
    parts: Part[];
  };
};
```

### Chat Contract (`packages/core-contract/src/chat.contract.ts`)

- `chat.list -> TChat[]`
- `chat.create` input: `{ canvas_id, title, local_path?: string | null, x, y }`
- `chat.update` input: `{ params: { id }, body: { title? } }`
- `chat.remove` input: `{ params: { id } }`

### OpenCode Contract (`packages/core-contract/src/opencode.contract.ts`)

Primary chat-facing endpoints:

- `opencode.prompt`: send structured parts + optional `agent`; output `{ info, parts }`.
- `opencode.events`: async iterator of OpenCode events.
- `opencode.app.agents`: fetch agent list scoped by chat path.
- `opencode.session.init`: initialize project/session context.
- `opencode.session.command`: execute OpenCode command payloads.
- `opencode.find.files`: backend fuzzy path search for `@` autocomplete.

Additional exposed OpenCode API surface (currently available to SPA):

- `opencode.app.log`, `opencode.path.get`, `opencode.config.get`, `opencode.config.providers`,
- `opencode.find.text`, `opencode.file.read`, `opencode.auth.set`, `opencode.session.shell`.

### Agent Logs Contract (`packages/core-contract/src/agent-logs.contract.ts`)

- `agent-logs.getBySession`: `{ params: { sessionId } }`
- Output union: `TAgentLog[] | { type: "ERROR"; message: "Failed to get agent logs" }`

## Backend Implementation

### Functional Core (`packages/functional-core/src/chat/`)

`ctrl.create-chat.ts`

- Validates target canvas exists.
- Creates OpenCode session (`session.create`) using requested `local_path`.
- Inserts `chats` row and writes CRDT chat element (`w: 360`, `h: 460`, `isCollapsed: false`).
- On CRDT failure, deletes inserted chat row (compensating rollback).

`ctrl.update-chat.ts`

- Updates chat title only.
- Returns `CTRL.CHAT.UPDATE_CHAT.NOT_FOUND` when row missing.

`ctrl.delete-chat.ts`

- Deletes chat row by id.
- Calls `opencodeService.closeClient(chatId)`.

### Server APIs (`apps/server/src/apis/`)

`api.chat.ts`

- `create`: defaults `local_path` to `os.homedir()` if null/undefined.
- `update`: updates row and publishes `dbUpdatePublisher` event (`table: chats`, `change: update`).
- `remove`: deletes row and closes cached client.

`api.opencode.ts`

- `requireChatContext(chatId)` resolves chat row and gets/creates OpenCode client.
- `prompt`:
  - sends `client.session.prompt({ sessionID, agent, parts, directory })`,
  - fetches user message by `parentID` with `session.message`,
  - stores user + assistant entries in `agent_logs` transaction.
- `events`:
  - subscribes to `client.event.subscribe({ directory: chat.local_path })`,
  - streams raw OpenCode events to client.
- Includes error translation (`NotFound`, bad request, generic OpenCode error).

`api.agent-logs.ts`

- Retrieves all log rows for `session_id`.
- Returns contract-safe error union on failure.

### OpenCode Service (`packages/imperative-shell/src/opencode/srv.opencode.ts`)

- Singleton service.
- Reuses healthy daemon across watch restarts when possible.
- Spawns new daemon on available port when needed.
- Caches OpenCode clients by key (`getClient(key, directory?)`), supports disposal by `closeClient`.

## SPA Implementation

### Canvas Integration

`cmd.draw-new.ts`

- Chat tool click calls `api.chat.create`.
- Uses `localStorage['vibecanvas-filetree-last-path']` as optional default folder.
- Pushes returned chat row into `store.chatSlice.backendChats[canvasId]`.

`chat.class.ts`

- Chat renderable extends `AElement<'chat'>` and supports standard transform actions.
- Mounts DOM overlay into `#canvas-overlay-entrypoint`.
- Computes screen-space bounds from stage transform and updates Solid signal only when changed (epsilon check).

`chat.apply-delete.ts`

- Removes element and emits CRDT delete change.
- Calls `api.chat.remove` asynchronously; toasts on API failure.

### Chat View + Context

`chat.tsx`

- Header shows title + session id.
- Folder subtitle shown as tilde path when under home directory.
- Wires slash command handling and dialog rendering.
- Opens `PathPickerDialog` for folder change flow.

`chat.context.tsx`

- Maintains normalized local graph:
  - `messages`,
  - `parts`,
  - `messageOrder`,
  - `sessionStatus`.
- Rehydrates history from `agent-logs` by timestamp.
- Subscribes to `opencode.events` and applies session-filtered updates.
- Inserts optimistic user message and parts before prompt request returns.
- Loads and manages selectable agents from `opencode.app.agents`.
- Computes status metadata (`agent/model/provider`) from latest assistant message payload.

### Message Rendering

`chat-message.tsx` supports part rendering for:

- `text`, `file`, `tool`, `reasoning`, `step-start`, `step-finish`, `agent`, `retry`.
- Hidden/skipped part types: `snapshot`, `patch`, `compaction`, `subtask`.

## Composer, Autocomplete, and Drag-Drop

### ProseMirror

- Schema: `doc -> paragraph+` with inline `text`, `hard_break`, `image_token`.
- `pasteImagePlugin` converts pasted image files into data-url `file` tokens.
- Custom `image_token` nodeview shows removable chip + hover preview.

### Sending Behavior

- Enter:
  - selects autocomplete item if menu open,
  - otherwise sends if non-empty.
- Shift+Enter inserts hard break.
- Serialization order: file parts first, then one trimmed text part.

### Slash and Mention Autocomplete

- `/` autocomplete uses local command catalog + fuzzysort.
- `@` autocomplete calls `opencode.find.files` (directory + file lookups), then client-side ranks using:
  - hidden-path heuristics,
  - mention frecency,
  - path depth,
  - lexical tie-break.
- Mention insertion always writes `@path ` token.
- Tab/Shift+Tab:
  - when autocomplete open -> select next/prev item,
  - when closed -> cycle selected agent.

### Filetree Drag-Drop into Composer

- Accepts `application/x-vibecanvas-filetree-node` payload.
- Converts dropped path to chat-relative path using `toRelativePathWithinBase`.
- Rejects out-of-scope paths with explicit error toast.
- Inserts mention at drop caret (`posAtCoords`).

## Dialog Menu and Slash Command System

### Implemented Slash Actions in `chat.tsx`

- `/exit`: delete widget.
- `/copy`: copies formatted transcript from local message graph.
- `/init`: calls `api.opencode.session.init`.
- Dialog commands:
  - `/agents`: opens dynamic agents picker dialog.
  - `/test-menu`: opens static demo dialog.

### Suggested but Not Yet Implemented Commands

Autocomplete advertises commands including:

- `/compact`, `/models`, `/new`, `/rename`, `/sessions`, `/skills`, `/timeline`, `/undo`.

Current behavior for unhandled commands is toast-based "not implemented" feedback.

### Chat Dialog UI (`chat-dialog.tsx`)

- In-chat overlay (not global modal).
- Supports nested submenus, searchable lists, keyboard navigation, section headers, and inline input rows.
- Keybindings: Up/Down, Tab/Shift+Tab, Enter, Escape, type-to-focus-search.

## State and Sync Lifecycle

- Store bootstrap:
  - `store.ts` loads `chatSlice.backendChats[canvasId]` from `canvas.get` response.
- Canvas-level DB events:
  - `Canvas.tsx` subscribes to `api.db.events`.
  - `chats` update events patch existing rows.
  - `chats` delete events remove rows from all canvas buckets.
- Message stream:
  - handled independently via `opencode.events` and local widget state.
- Connection state:
  - session busy -> `STREAMING`,
  - retry -> `RETRYING`,
  - idle -> `FINISHED`,
  - focus input while finished -> `READY`.

## Error Handling

- Prompt errors are logged; optimistic UI remains and later stream reconciliation can replace it.
- Event subscription failure sets chat connection state to `ERROR`.
- `session.error` events also set `ERROR`.
- Drag-drop mention rejects paths outside chat folder.
- Delete API failure shows toast after local CRDT removal.
- `agent-logs.getBySession` uses explicit success/error union for safe UI handling.

## Performance and UX Notes

- Overlay bounds updates are throttled by change detection (`BOUNDS_EPSILON`) to avoid unnecessary signal churn.
- Auto-scroll triggers only when user is near bottom (`SCROLL_THRESHOLD = 50`).
- File search in autocomplete is debounced (`180ms`) and request-id guarded to avoid stale UI races.
- Autocomplete list is capped (`MAX_AUTOCOMPLETE_ITEMS = 10`).
- Mention candidate fetches are bounded (`MAX_FILE_SUGGESTION_LIMIT = 200`).

## Testing and Verification

- `bun --filter @vibecanvas/spa build`
- `bun --filter @vibecanvas/server test`

Manual smoke checklist:

- Create chat widget and verify CRDT presence + chat row creation.
- Send plain text, multiline (`Shift+Enter`), and pasted images.
- Verify optimistic user bubble then streamed assistant parts/tool blocks.
- Verify `/copy`, `/init`, `/agents`, and `/test-menu`.
- Verify unimplemented slash command shows feedback.
- Verify `@` suggestions, Tab/Shift+Tab navigation, and drag-drop mentions from filetree.
- Change folder via PATH dialog and confirm new offset chat/session appears.
- Delete chat and confirm local widget removal + backend row removal.

## File Map

### Contracts

- `packages/core-contract/src/chat.contract.ts`
- `packages/core-contract/src/opencode.contract.ts`
- `packages/core-contract/src/agent-logs.contract.ts`
- `packages/core-contract/src/db.contract.ts`

### Functional Core

- `packages/functional-core/src/chat/ctrl.create-chat.ts`
- `packages/functional-core/src/chat/ctrl.update-chat.ts`
- `packages/functional-core/src/chat/ctrl.delete-chat.ts`

### Imperative Shell

- `packages/imperative-shell/src/database/schema.ts`
- `packages/imperative-shell/src/opencode/srv.opencode.ts`

### Server APIs

- `apps/server/src/apis/api.chat.ts`
- `apps/server/src/apis/api.opencode.ts`
- `apps/server/src/apis/api.agent-logs.ts`
- `apps/server/src/apis/api.db.ts`

### SPA Chat

- `apps/spa/src/features/chat/components/chat.tsx`
- `apps/spa/src/features/chat/components/chat-input.tsx`
- `apps/spa/src/features/chat/components/chat-message.tsx`
- `apps/spa/src/features/chat/components/chat-header.tsx`
- `apps/spa/src/features/chat/components/status-line.tsx`
- `apps/spa/src/features/chat/components/chat-dialog.tsx`
- `apps/spa/src/features/chat/components/chat-dialog-commands.ts`
- `apps/spa/src/features/chat/components/chat-dialog.cmd.agents.ts`
- `apps/spa/src/features/chat/context/chat.context.tsx`
- `apps/spa/src/features/chat/prosemirror/schema.ts`
- `apps/spa/src/features/chat/prosemirror/serialize.ts`
- `apps/spa/src/features/chat/prosemirror/plugins/paste-image.ts`
- `apps/spa/src/features/chat/prosemirror/nodeviews/image-token-view.ts`
- `apps/spa/src/features/chat/utils/format-transcript.ts`

### SPA Canvas + Store Integration

- `apps/spa/src/features/canvas-crdt/input-commands/cmd.draw-new.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.class.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.apply-delete.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.state-machine.ts`
- `apps/spa/src/features/canvas-crdt/Canvas.tsx`
- `apps/spa/src/store.ts`
- `apps/spa/src/index.css`
- `apps/spa/src/components/path-picker-dialog.tsx`

## Data Flow Diagram

```mermaid
flowchart TD
  U1[User picks chat tool] --> C1[SPA cmd.draw-new calls api.chat.create]
  C1 --> S1[Server ctrlCreateChat]
  S1 --> O1[OpenCode session.create(directory)]
  S1 --> D1[Insert chats row]
  S1 --> A1[Automerge add chat element]
  A1 --> W1[ChatElement mounts DOM overlay + Chat component]

  W1 --> H1[Load history from agent-logs.getBySession]
  W1 --> G1[Load agents via opencode.app.agents]
  W1 --> E1[Subscribe opencode.events iterator]

  U2[User composes in ProseMirror] --> P1[Serialize to file/text parts]
  P1 --> P2[Optimistic user message in local chatState]
  P1 --> API1[api.opencode.prompt]
  API1 --> O2[OpenCode session.prompt]
  O2 --> O3[OpenCode session.message for parent user msg]
  O2 --> L1[Persist user + assistant rows to agent_logs]

  E1 --> EV1[message/session events]
  EV1 --> F1[Client filters by session_id]
  F1 --> S2[Update local messages/parts/status]
  S2 --> UI1[ChatMessages + StatusLine rerender]

  U3[/agents slash command] --> M1[Open dynamic ChatDialog]
  M1 --> A2[Select agent]
  A2 --> P3[Next prompt includes selected agent]

  U4[PATH folder change] --> P4[PathPickerDialog]
  P4 --> C2[Create new chat offset + new OpenCode session]

  U5[Delete widget] --> D2[chat.apply-delete]
  D2 --> A3[CRDT delete element]
  D2 --> API2[api.chat.remove]
  API2 --> D3[Delete chats row + close OpenCode client]
```
