# Chat Fullstack Spec

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Assumptions](#assumptions)
4. [User Flow](#user-flow)
5. [Composer and ProseMirror](#composer-and-prosemirror)
6. [Data Contracts and Shapes](#data-contracts-and-shapes)
7. [Backend Implementation](#backend-implementation)
8. [SPA Implementation](#spa-implementation)
9. [State, Sync, and Event Lifecycle](#state-sync-and-event-lifecycle)
10. [Performance and UX Behavior](#performance-and-ux-behavior)
11. [Error Handling](#error-handling)
12. [Testing and Verification](#testing-and-verification)
13. [File Map](#file-map)
14. [Data Flow Diagram](#data-flow-diagram)

## Overview

The Chat feature is a canvas widget that embeds an AI conversation UI directly on the CRDT canvas.

It is implemented as:

- A CRDT element (`type: "chat"`) for placement, resize, rotation, and delete behavior.
- A backend database row (`chats` table) for widget metadata (`title`, `session_id`, `local_path`, `canvas_id`).
- An OpenCode session per chat ID, managed server-side via `OpencodeService`.
- A ProseMirror-based input composer that supports multiline text, image tokens, paste-image handling, and autocomplete.
- Event streaming (`ai.events`) for live agent output plus persisted history replay from `agent_logs`.

The feature uses a hybrid model: geometry lives in Automerge CRDT, while chat/session metadata and message history live in SQLite and OpenCode runtime.

## Requirements

- Users can create chat widgets from the canvas drawing tool (`chat`).
- Widget supports move/resize/rotate/select/delete like other CRDT elements.
- Creating a chat must create:
  - a `chats` DB row,
  - an OpenCode session (`session_id`),
  - and a CRDT element in the active canvas doc.
- Composer supports:
  - Enter to send,
  - Shift+Enter for newline,
  - image paste as file parts,
  - autocomplete for slash commands (`/`) and file mentions (`@`),
  - drag-drop filetree rows into composer to insert `@relative/path ` mentions (relative to chat local path).
- Prompt sends structured parts (`text` and/or `file`) to backend `ai.prompt`.
- Event stream updates message/part state in real time.
- Previous messages load from `agent_logs` on mount.
- Folder selection changes working directory by creating a new chat/session.

## Assumptions

- Chat metadata is globally mirrored in `store.chatSlice.backendChats[canvasId]`.
- Message bodies are not mirrored in global store; they are local component state (`chatState`).
- A chat's local path is treated as session-scoped context; changing path starts a new session instead of mutating existing session directory.
- ProseMirror serialized output sends file parts first, then combined text part.
- `ai.events` stream may include cross-session events for same directory; client filters by `sessionID` before applying.

## User Flow

1. User selects `chat` tool and clicks canvas.
2. SPA calls `api.chat.create({ canvas_id, x, y, title, local_path })`.
3. Server creates OpenCode session + `chats` row + CRDT chat element.
4. Chat renderable mounts overlay and renders `Chat` Solid component.
5. `Chat` loads persisted logs via `agent-logs.getBySession` and subscribes to `ai.events`.
6. User composes message in ProseMirror editor, optionally adding images/autocomplete tokens.
7. On send, SPA adds optimistic user message locally and calls `ai.prompt`.
8. Streamed events update message parts and status until session returns idle.
9. User can remove widget (CRDT delete + `chat.remove`) or select new folder (creates new chat/session).

## Composer and ProseMirror

### Schema (`apps/spa/src/features/chat/prosemirror/schema.ts`)

- `doc` -> `paragraph+`
- Inline nodes:
  - `text`
  - `hard_break`
  - `image_token` (atom node with `id`, `filename`, `mime`, `url`)

### Plugins and key behavior (`chat-input.tsx`)

- `history()` + undo/redo keybinds (`Mod-z`, `Mod-Shift-z`).
- `pasteImagePlugin` intercepts paste events, filters image MIME types, converts to data URL, inserts `image_token` node.
- Composer `handleDOMEvents` accepts drag payload `application/x-vibecanvas-filetree-node` and inserts mention text at drop caret via `posAtCoords`.
- Drag-dropped file references are accepted only when source path is inside chat local path; otherwise composer shows an error toast and skips insertion.
- Placeholder plugin sets `data-placeholder` while doc is empty.
- Enter behavior:
  - if autocomplete open -> select highlighted item,
  - else send message if non-empty,
  - else no-op.
- `Shift-Enter` inserts `hard_break`.

### Autocomplete model

- Triggers:
  - `/` for command suggestions (`fix`, `plan`, `explain`, `test`, `review`),
  - `@` for file suggestions derived from `file.files` traversal.
- Matching uses current textblock caret context and regex `/(^|\\s)([@/])([^\\s@/]*)$/`.
- Menu positioning uses `coordsAtPos` and composer host offset.
- Keyboard navigation: ArrowUp/ArrowDown, Tab, Enter, Escape.

### Serialization (`serialize.ts`)

- Collects `image_token` nodes into `file` parts.
- Collects paragraph/hard-break content into a single trimmed `text` part.
- Final payload order is `[...fileParts, ...textParts]`.

## Data Contracts and Shapes

### Database schema

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

### Chat contract (`packages/core-contract/src/chat.contract.ts`)

- `chat.list` -> `TChat[]`
- `chat.create` input:
  - `canvas_id: string`
  - `title: string`
  - `local_path?: string | null`
  - `x: number`
  - `y: number`
- `chat.update` input: `{ params: { id }, body: { title? } }`
- `chat.remove` input: `{ params: { id } }`

### AI contract (`packages/core-contract/src/ai.contract.ts`)

- `ai.prompt` input: `{ chatId, parts[] }` where parts include `text`, `file`, `agent`, `subtask`.
- `ai.prompt` output: `{ info: AssistantMessage, parts: Part[] }`.
- `ai.events` input: `{ chatId }`, output: async event iterator of OpenCode events.

### Agent logs contract (`packages/core-contract/src/agent-logs.contract.ts`)

- `agent-logs.getBySession` input: `{ params: { sessionId } }`
- output: `TAgentLog[] | { type: "ERROR", message: "Failed to get agent logs" }`

## Backend Implementation

### Functional core (`packages/functional-core/src/chat/`)

#### `ctrl.create-chat.ts`
- Validates target canvas exists.
- Creates OpenCode session using provided `local_path`.
- Inserts `chats` row.
- Appends CRDT `chat` element to canvas doc with default dimensions (`w: 360`, `h: 460`).
- On CRDT failure, deletes inserted chat row (compensating rollback).

#### `ctrl.update-chat.ts`
- Supports title update only.
- Returns NOT_FOUND when no row updated.

#### `ctrl.delete-chat.ts`
- Deletes chat row by ID.
- Closes cached OpenCode client for that chat ID.

### Server APIs (`apps/server/src/apis/`)

#### `api.chat.ts`
- `create`: wraps controller, defaults `local_path` to `os.homedir()` when input is null/undefined, returns fresh row.
- `update`: applies title update, publishes DB update event (`table: "chats"`).
- `remove`: deletes chat and closes client.

#### `api.ai.ts`
- `prompt`:
  - resolves chat row and OpenCode client,
  - sends `session.prompt({ sessionID, parts, directory })`,
  - fetches full user message via `session.message(...)`,
  - persists both user+assistant messages in `agent_logs` transaction.
- `events`:
  - subscribes to OpenCode event stream (`client.event.subscribe({ directory })`),
  - yields events to SPA iterator.

#### `api.agent-logs.ts`
- Fetches all logs by `session_id` for hydration on widget mount.

## SPA Implementation

### Canvas renderable integration

#### `chat.class.ts`
- Extends `AElement<'chat'>`.
- Reuses standard transform actions (`move`, `resize`, `rotate`, `scale`, `delete`, `clone`, selection).
- Creates DOM overlay under `#canvas-overlay-entrypoint` and keeps bounds synced each ticker frame.
- Renders `Chat` component with reactive `bounds` and connection state signal.

#### `chat.apply-delete.ts`
- Removes renderable from canvas and emits CRDT delete change.
- Calls `api.chat.remove` asynchronously; shows toast on backend failure.

### Chat component behavior (`chat.tsx`)

- Resolves current chat metadata from `store.chatSlice.backendChats[canvasId]`.
- Maintains local message graph:
  - `messages: Record<id, Message>`
  - `parts: Record<id, Part>`
  - `messageOrder: string[]`
  - `sessionStatus`
- Loads history from `agent_logs` and sorts by timestamp ascending.
- Subscribes to `ai.events` and applies event updates with session filtering.
- Implements optimistic user message before `ai.prompt` response arrives.
- Supports auto-scroll while user is near bottom (`SCROLL_THRESHOLD = 50`).

### File suggestions for `@` autocomplete

- Loads with `api.file.files({ path: local_path, max_depth: 4 })`.
- Flattens nested directory tree into file list, sorts by path, caps to 300 suggestions.
- Refreshes when `chat.local_path` changes.

### Header and status UI

- `ChatHeader` handles drag pointer events and widget actions (set folder, collapse placeholder, remove).
- Chat folder subtitle uses `~` display when local path is inside home directory.
- `StatusLine` maps `CONNECTION_STATE` to labels/colors.
- `PathPickerDialog` action currently creates a new chat with offset position (`+30,+30`) and selected path.

## State, Sync, and Event Lifecycle

- Global store bootstraps chat metadata from `canvas.get` (`response.chats`).
- Canvas-level DB event subscription (`api.db.events`) updates/removes chat rows in store for live sync.
- Chat content stream is independent from DB events and handled via `ai.events` + local `chatState`.
- On `session.idle`, UI moves to `FINISHED`; focusing input resets to `READY`.

## Performance and UX Behavior

- Overlay bounds update every ticker frame to keep DOM widget aligned during pan/zoom/transform.
- Message rendering derives grouped view via memo (`orderedMessages`) from normalized local store.
- Auto-scroll only triggers when user is already near bottom to avoid stealing scroll.
- Autocomplete items are capped (`MAX_AUTOCOMPLETE_ITEMS = 8`) and menu is keyboard navigable.
- File autocomplete payload is bounded (`max_depth: 4`, max 300 flattened results).

## Error Handling

- Prompt and log load errors are logged and reflected via connection state when relevant.
- Event stream init failure sets chat state to `ERROR`.
- `session.error` events also set `ERROR`.
- Delete backend failure surfaces toast; CRDT deletion already applied locally.
- `agent-logs.getBySession` returns explicit error union for contract-safe handling.

## Testing and Verification

- `bun --filter @vibecanvas/spa build`
  - validates SPA compile with ProseMirror integration.
- `bun --filter @vibecanvas/server test`
  - validates API/controller behavior where tests exist.
- Manual smoke:
  - run `bun server:dev` + `bun client:dev`,
  - create chat widget,
  - send plain text, multiline (`Shift+Enter`), and pasted image,
  - verify optimistic user message then streamed assistant parts,
  - test `/` and `@` autocomplete behavior,
  - drag file and folder rows from filetree widget into composer and confirm mention insertion at drop position,
  - switch chat folder via PATH and confirm new chat/session,
  - delete widget and verify chat row/session cleanup behavior.

## File Map

### Contracts

- `packages/core-contract/src/chat.contract.ts`
- `packages/core-contract/src/ai.contract.ts`
- `packages/core-contract/src/agent-logs.contract.ts`
- `packages/core-contract/src/db.contract.ts`

### Functional Core

- `packages/functional-core/src/chat/ctrl.create-chat.ts`
- `packages/functional-core/src/chat/ctrl.update-chat.ts`
- `packages/functional-core/src/chat/ctrl.delete-chat.ts`

### Imperative Shell

- `packages/imperative-shell/src/database/schema.ts` (`chats`, `agent_logs`)
- `packages/imperative-shell/src/opencode/srv.opencode.ts`

### Server

- `apps/server/src/apis/api.chat.ts`
- `apps/server/src/apis/api.ai.ts`
- `apps/server/src/apis/api.agent-logs.ts`
- `apps/server/src/apis/api.db.ts`

### SPA (Chat feature)

- `apps/spa/src/features/chat/components/chat.tsx`
- `apps/spa/src/features/chat/components/chat-input.tsx`
- `apps/spa/src/features/chat/components/chat-message.tsx`
- `apps/spa/src/features/chat/components/chat-header.tsx`
- `apps/spa/src/features/chat/components/status-line.tsx`
- `apps/spa/src/features/chat/prosemirror/schema.ts`
- `apps/spa/src/features/chat/prosemirror/serialize.ts`
- `apps/spa/src/features/chat/prosemirror/plugins/paste-image.ts`
- `apps/spa/src/features/chat/prosemirror/nodeviews/image-token-view.ts`
- `apps/spa/src/features/chat/store/chat.slice.ts`

### SPA (Canvas integration)

- `apps/spa/src/features/canvas-crdt/input-commands/cmd.draw-new.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.class.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.apply-delete.ts`
- `apps/spa/src/features/canvas-crdt/renderables/elements/chat/chat.state-machine.ts`
- `apps/spa/src/features/canvas-crdt/Canvas.tsx`
- `apps/spa/src/store.ts`
- `apps/spa/src/index.css` (composer/token/autocomplete styles)

## Data Flow Diagram

```mermaid
flowchart TD
  U[User picks chat tool] --> C1[SPA cmd.draw-new calls api.chat.create]
  C1 --> S1[Server ctrlCreateChat]
  S1 --> O1[OpenCode session.create(directory)]
  S1 --> D1[Insert chats row]
  S1 --> A1[Automerge add chat element]
  A1 --> R1[ChatElement overlay mounts Chat component]

  R1 --> H1[Load agent-logs by session]
  R1 --> E1[Subscribe ai.events stream]

  U2[User composes in ProseMirror] --> P1[Serialize to parts text/file]
  P1 --> P2[Optimistic local user message]
  P1 --> AP[api.ai.prompt]
  AP --> O2[OpenCode session.prompt]
  O2 --> L1[Persist user and assistant records in agent_logs]
  O2 --> AP

  E1 --> EV[message/session events]
  EV --> M1[Update local chatState messages/parts/status]
  M1 --> UI[ChatMessages render]

  U3[User deletes widget] --> X1[chat.apply-delete]
  X1 --> A2[CRDT delete chat element]
  X1 --> S2[api.chat.remove]
  S2 --> D2[Delete chats row + close OpenCode client]
```
