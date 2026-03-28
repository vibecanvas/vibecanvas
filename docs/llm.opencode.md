# PTY Usage Guide

This guide documents the PTY API that already exists in OpenCode, but is not covered in the main docs yet.

It is based on the current implementation in:

- `packages/opencode/src/server/routes/pty.ts`
- `packages/opencode/src/pty/index.ts`
- `packages/sdk/js/src/v2/gen/sdk.gen.ts`
- `packages/app/src/components/terminal.tsx`

## What the PTY API is

The PTY API lets you:

1. create a shell-backed terminal session
2. inspect and rename it
3. resize it
4. remove it
5. stream terminal I/O over WebSocket

PTY sessions are:

- in-memory only
- scoped to the current OpenCode instance/directory
- removed when the process exits or when you call remove
- not persisted across server restarts

## Server endpoints

### `GET /pty`

List active PTY sessions.

Query params:

- `directory?: string`
- `workspace?: string`

Response:

```json
[
  {
    "id": "pty_...",
    "title": "Terminal 1234",
    "command": "/bin/zsh",
    "args": ["-l"],
    "cwd": "/path/to/project",
    "status": "running",
    "pid": 12345
  }
]
```

### `POST /pty`

Create a PTY session.

Query params:

- `directory?: string`
- `workspace?: string`

JSON body:

```json
{
  "command": "/bin/zsh",
  "args": ["-l"],
  "cwd": "/path/to/project",
  "title": "Dev Shell",
  "env": {
    "FOO": "bar"
  }
}
```

All fields are optional.

Defaults:

- `command`: preferred shell from `Shell.preferred()`
- `args`: `[]`, except commands ending in `sh` get `-l` appended
- `cwd`: current instance directory
- `title`: `Terminal ${id.slice(-4)}`

Server-side env is merged as:

1. `process.env`
2. request `env`
3. plugin-provided shell env

OpenCode also forces:

- `TERM=xterm-256color`
- `OPENCODE_TERMINAL=1`

Response:

```json
{
  "id": "pty_...",
  "title": "Dev Shell",
  "command": "/bin/zsh",
  "args": ["-l"],
  "cwd": "/path/to/project",
  "status": "running",
  "pid": 12345
}
```

### `GET /pty/{ptyID}`

Get one PTY session.

Response: same `Pty` object as create/list.

### `PUT /pty/{ptyID}`

Update a PTY session.

JSON body:

```json
{
  "title": "Renamed Terminal",
  "size": {
    "rows": 40,
    "cols": 120
  }
}
```

Supported updates:

- `title`
- `size.rows` + `size.cols` for resize

Response: updated `Pty` object.

### `DELETE /pty/{ptyID}`

Kill and remove a PTY session.

Response:

```json
true
```

### `GET /pty/{ptyID}/connect`

This is the interactive endpoint.

Important: although OpenAPI/SDK expose this as a normal `GET`, the server actually upgrades it to a WebSocket.

Query params:

- `directory?: string`
- `workspace?: string`
- `cursor?: number`

`cursor` behavior:

- `0`: replay buffered output from the start of the retained buffer
- `12345`: replay from that cursor position
- `-1`: skip replay and start from the live end
- invalid or missing: behaves like `0`

## PTY object shape

```ts
type Pty = {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: "running" | "exited"
  pid: number
}
```

## SDK surface

The generated JS SDK exposes:

```ts
client.pty.list()
client.pty.create()
client.pty.get()
client.pty.update()
client.pty.remove()
client.pty.connect()
```

Example setup:

```ts
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/path/to/project",
})
```

### Create/list/get/update/remove

These work like normal SDK calls and return the generated client response shape.

```ts
const created = await client.pty.create({
  title: "Dev Shell",
  cwd: "/path/to/project",
  env: { FOO: "bar" },
})

const id = created.data.id

await client.pty.update({
  ptyID: id,
  title: "Main Shell",
  size: { cols: 120, rows: 40 },
})

const one = await client.pty.get({ ptyID: id })
const all = await client.pty.list()
await client.pty.remove({ ptyID: id })
```

### `client.pty.connect()` caveat

`client.pty.connect()` exists in the generated SDK because the route is in OpenAPI, but it is typed like a plain HTTP `GET` returning `boolean`.

That is not enough for an interactive terminal session.

For real PTY I/O, construct a WebSocket manually against `/pty/{ptyID}/connect`.

## WebSocket protocol

The WebSocket is bidirectional:

- client -> server: terminal input as plain strings
- server -> client: terminal output as plain strings
- server -> client: occasional binary control frame with cursor metadata

### Control frame format

Binary frames with first byte `0` are metadata frames.

The remaining bytes are UTF-8 JSON:

```json
{ "cursor": 12345 }
```

The app uses this cursor to resume from the right point on reconnect.

### Buffering behavior

The server keeps a rolling output buffer:

- max retained buffer: 2 MB
- replay chunks are sent in 64 KB slices

If your `cursor` is older than the retained buffer window, only the retained tail can be replayed.

## Browser example

```ts
import { createOpencodeClient } from "@opencode-ai/sdk"

const baseUrl = "http://127.0.0.1:4096"

const client = createOpencodeClient({
  baseUrl,
  directory: "/path/to/project",
})

const created = await client.pty.create({ title: "Browser Shell" })
const id = created.data.id

const url = new URL(`${baseUrl}/pty/${id}/connect`)
url.searchParams.set("directory", "/path/to/project")
url.searchParams.set("cursor", "-1")
url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

const ws = new WebSocket(url)
ws.binaryType = "arraybuffer"

const decoder = new TextDecoder()

ws.addEventListener("open", () => {
  ws.send("pwd\n")
})

ws.addEventListener("message", (event) => {
  if (event.data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(event.data)
    if (bytes[0] === 0) {
      const meta = JSON.parse(decoder.decode(bytes.subarray(1)))
      console.log("cursor", meta.cursor)
    }
    return
  }

  console.log("output", event.data)
})
```

## Node example

```ts
import { createOpencodeClient } from "@opencode-ai/sdk"
import WebSocket from "ws"

const baseUrl = "http://127.0.0.1:4096"
const dir = "/path/to/project"

const client = createOpencodeClient({
  baseUrl,
  directory: dir,
})

const created = await client.pty.create({ title: "Node Shell" })
const id = created.data.id

const url = new URL(`${baseUrl}/pty/${id}/connect`)
url.searchParams.set("directory", dir)
url.searchParams.set("cursor", "0")
url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

const ws = new WebSocket(url)
const decoder = new TextDecoder()

ws.on("message", (data, isBinary) => {
  if (isBinary) {
    const bytes = new Uint8Array(data as Buffer)
    if (bytes[0] === 0) {
      console.log("meta", JSON.parse(decoder.decode(bytes.subarray(1))))
    }
    return
  }

  console.log(String(data))
})

ws.on("open", async () => {
  ws.send("echo hello from pty\\n")

  await client.pty.update({
    ptyID: id,
    size: { cols: 100, rows: 30 },
  })
})
```

## Events you can subscribe to

PTY lifecycle events are also emitted through the regular event stream:

- `pty.created` with `{ info }`
- `pty.updated` with `{ info }`
- `pty.exited` with `{ id, exitCode }`
- `pty.deleted` with `{ id }`

Example:

```ts
const events = await client.event.subscribe()

for await (const event of events.stream) {
  if (event.type === "pty.exited") {
    console.log("pty exited", event.properties.id, event.properties.exitCode)
  }
}
```

## Practical lifecycle

Typical flow:

1. `client.pty.create()`
2. open WebSocket to `/pty/{ptyID}/connect`
3. send keystrokes with `ws.send(...)`
4. render output from WebSocket messages
5. call `client.pty.update({ ptyID, size })` on resize
6. react to `pty.exited` if you want cleanup or UI updates
7. call `client.pty.remove({ ptyID })` when done

## Caveats

- PTY sessions are not durable; they disappear on server restart.
- Input is only exposed over WebSocket at the server API level; there is no public HTTP `write` endpoint.
- Resize is exposed through `PUT /pty/{ptyID}` rather than a dedicated resize route.
- The generated SDK includes `client.pty.connect()`, but interactive clients should open a WebSocket manually.
- On process exit, the implementation publishes `pty.exited` and then removes the session, which leads to `pty.deleted`.
