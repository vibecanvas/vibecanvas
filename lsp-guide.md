# LSP Integration Guide

Integrate Language Server Protocol with CodeMirror to provide intelligent code features.

---

## Architecture

The system has three main components:

- **Server**: Spawns LSP processes via stdio, handles initialization and lifecycle
- **Client**: Manages JSON-RPC communication (vscode-jsonrpc), sends requests/receives notifications
- **Coordinator**: Routes operations, spawns on-demand, tracks active clients

---

## Communication Protocol

LSP servers communicate via stdio using JSON-RPC 2.0:

```javascript
// Message format
Content-Length: <body-length>\r\n
\r\n
<json-body>

// Example request
Content-Length: 73\r\n
\r\n
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}
```

The client reads/writes these messages to/from the server's stdin/stdout.

---

## Server Spawning

Each LSP server is a configured process:

```ts
{
  id: "typescript",
  extensions: [".ts", ".tsx", ".js"],
  root: async (file) => determineProjectRoot(file),
  spawn: async (root) => {
    const process = spawn("typescript-language-server", ["--stdio"], { cwd: root })
    return { process, initialization: { customOptions } }
  }
}
```

Use `child_process.spawn()` with `--stdio` flag for most servers.

---

## Client Lifecycle

1. Create connection from process streams:

```ts
const connection = createMessageConnection(
  new StreamMessageReader(process.stdout),
  new StreamMessageWriter(process.stdin),
)
```

2. Initialize server:

```ts
await connection.sendRequest("initialize", {
  rootUri: pathToFileURL(root).href,
  capabilities: {
    textDocument: {
      hover: true,
      definition: true,
      completion: true,
    },
  },
})
await connection.sendNotification("initialized", {})
```

3. Track file state:

```ts
const files = new Map<string, number>()

function fileOpened(path, uri, content, languageId) {
  files.set(path, 0)
  connection.sendNotification("textDocument/didOpen", {
    textDocument: { uri, languageId, version: 0, text: content },
  })
}

function fileChanged(path, uri, content) {
  const version = (files.get(path) ?? -1) + 1
  files.set(path, version)
  connection.sendNotification("textDocument/didChange", {
    textDocument: { uri, version },
    contentChanges: [{ text: content }],
  })
}
```

4. Handle diagnostics:

```ts
const diagnostics = new Map<string, Diagnostic[]>()

connection.onNotification("textDocument/publishDiagnostics", (params) => {
  const file = fileURLToPath(params.uri)
  diagnostics.set(file, params.diagnostics)
  // Update editor UI
})
```

---

## CodeMirror Integration

Wrap LSP client in a CodeMirror extension:

```ts
export const lspExtension = (file: string, lwm: LanguageServerManager) =>
  ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        this.connect(file, view)
      }

      async connect(file, view) {
        const client = await lwm.getClient(file)

        // Send initial content
        const content = view.state.doc.toString()
        const uri = pathToFileURL(file).href
        const languageId = getLanguageId(file)
        client.notify.open({ path: file })

        // Track changes
        this.changeHandler = () => {
          const newContent = view.state.doc.toString()
          // Use debouncing
          debouncedNotify(file, newContent)
        }

        // Provide autocomplete
        this.completions = lsp.completion(view, client)
      }
    },
    { decorators: this.completions },
  )
```

---

## Server Discovery

For any folder on disk, use file patterns to detect project type:

```ts
findNearestRoot(patterns: string[], file: string): string {
  let dir = path.dirname(file)
  while (dir !== rootBoundary) {
    if (patterns.some(p => existsSync(path.join(dir, p)))) {
      return dir
    }
    dir = path.dirname(dir)
  }
  return rootBoundary
}
```

Examples:

- TypeScript/Node: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- Go: `go.mod`, `go.sum`
- Python: `pyproject.toml`, `requirements.txt`, `setup.py`
- Rust: `Cargo.toml`
- Java: `pom.xml`, `build.gradle`
- C/C++: `compile_commands.json`, `CMakeLists.txt`

Combine this with file extension matching to select appropriate LSP server.

---

## Built-in Servers

Create a registry of popular servers:

| Server                   | Extensions     | Installation Method                |
| ------------------------ | -------------- | ---------------------------------- |
| typescript               | .ts, .tsx, .js | TypeScript package (via TS Server) |
| pyright                  | .py            | Bun npm install (runtime)          |
| gopls                    | .go            | `go install` (runtime)             |
| rust-analyzer            | .rs            | User PATH (manual)                 |
| clangd                   | .c, .cpp, .h   | GitHub download (runtime)          |
| eslint                   | .js, .ts, .tsx | Bun npm install (runtime)          |
| lua-ls                   | .lua           | User PATH (manual)                 |
| dart                     | .dart          | System `dart` command              |
| bash-language-server     | .sh, .bash     | Bun npm install (runtime)          |
| @vue/language-server     | .vue           | Bun npm install (runtime)          |
| yaml-language-server     | .yaml, .yml    | Bun npm install (runtime)          |
| svelte-language-server   | .svelte        | Bun npm install (runtime)          |
| @astrojs/language-server | .astro         | Bun npm install (runtime)          |
| intelephense             | .php           | Bun npm install (runtime)          |
| terraform-ls             | .tf, .tfvars   | GitHub download (runtime)          |
| zls                      | .zig           | GitHub download (runtime)          |

### Storage Locations Summary

| Type                  | Location                               | Examples                                            |
| --------------------- | -------------------------------------- | --------------------------------------------------- |
| **Bun/npm packages**  | `~/.local/share/app/bin/node_modules/` | pyright, bash-language-server, @vue/language-server |
| **Go tools**          | `~/.local/share/app/bin/`              | gopls                                               |
| **Compiled binaries** | `~/.local/share/app/bin/`              | clangd, zls, terraform-ls (with version suffix)     |
| **User-installed**    | `~/.cargo/bin/`, `/usr/local/bin/`     | rust-analyzer, lua-language-server                  |

### Installation Flow Diagram

```
User opens .py file
       │
       ▼
Check extension → Select pyright server
       │
       ▼
Check project root → find pyproject.toml
       │
       ▼
Check if pyright installed in ~/.local/share/app/bin/node_modules/
       │
       ├─ Exists → Spawn process → ✅ Done
       │
       └─ Not found → Check flag ALLOW_DOWNLOAD
                       │
                       ├─ Disabled → Show error ❌
                       │
                       └─ Enabled → bun install pyright
                                       │
                                       ▼
                               Download to bin/node_modules/
                                       │
                                       ▼
                               Spawn process → ✅ Done
```

---

## LSP Server Registry Design

Centralize all server definitions in a single module:

```ts
// lsp-registry.ts
export namespace LSPServers {
  export const typescript: Info = {
    /* ... */
  }
  export const pyright: Info = {
    /* ... */
  }
  export const gopls: Info = {
    /* ... */
  }
  export const rustAnalyzer: Info = {
    /* ... */
  }

  // Auto-discover all servers
  export const all: Info[] = [
    typescript,
    pyright,
    gopls,
    rustAnalyzer,
    // ... all others
  ]

  export function findForFile(file: string): Info | undefined {
    const ext = path.parse(file).ext
    return all.find((server) => server.extensions.includes(ext))
  }
}
```

This makes it easy to add new servers and maintain consistency.

---

Some servers auto-download; others require manual installation.

---

## LSP Installation & Distribution

LSP servers follow different installation patterns based on their ecosystem:

### Runtime On-Demand Installation

Most Node-based LSPs are downloaded **lazy** when first needed:

```ts
async spawn(root) {
  const binPath = path.join(GLOBAL_BIN_DIR, "node_modules", "pyright", "dist", "pyright-langserver.js")

  if (!(await Filesystem.exists(binPath))) {
    if (Flag.OPENCODE_DISABLE_LSP_DOWNLOAD) return

    // Download at runtime using bun install
    await Bun.spawn([BunProc.which(), "install", "pyright"], {
      cwd: GLOBAL_BIN_DIR,
      env: { ...process.env, BUN_BE_BUN: "1" },
    }).exited
  }

  return {
    process: spawn(BunProc.which(), ["run", binPath, "--stdio"], { cwd: root }),
  }
}
```

**Flow**: Check exists → If missing, `bun install` → Cache for future use

### Installation Methods by Category

| Installation Method                       | LSP Servers                                                                                                                                                           | Location                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Bun/npm install** (runtime)             | pyright, bash-language-server, @vue/language-server, yaml-language-server, svelte-language-server, @astrojs/language-server, intelephense, dockerfile-language-server | `~/.local/share/app/bin/node_modules/` |
| **Go install** (runtime)                  | gopls                                                                                                                                                                 | `~/.local/share/app/bin/gopls`         |
| **GitHub releases** (runtime)             | clangd, zls, terraform-ls, texlab, tinymist, elixir-ls                                                                                                                | `~/.local/share/app/bin/`              |
| **System PATH** (user manually installed) | rust-analyzer, lua-language-server, haskell-language-server, ocamllsp, clojure-lsp                                                                                    | User's PATH                            |

### Storage Structure

```
~/.local/share/app/bin/
├── node_modules/           # Bun-installed packages
│   ├── pyright/
│   ├── bash-language-server/
│   ├── @vue/language-server/
│   └── .bin/              # Symlinks to executables
├── gopls                   # Go-installed binary
├── clangd_1.5.0/          # Downloaded from GitHub
│   └── bin/clangd
├── zls                    # Downloaded from GitHub
└── package.json           # Record of installed packages
```

### Example: Complete Installer

```ts
export const Pyright: Info = {
  id: "pyright",
  extensions: [".py", ".pyi"],
  root: NearestRoot(["pyproject.toml", "setup.py", "requirements.txt"]),

  async spawn(root) {
    let binary = Bun.which("pyright-langserver")
    const args = []
    const binDir = Global.Path.bin

    // Check if already installed
    if (!binary) {
      const js = path.join(binDir, "node_modules", "pyright", "dist", "pyright-langserver.js")

      if (!(await Filesystem.exists(js))) {
        if (Flag.OPENCODE_DISABLE_LSP_DOWNLOAD) return

        // Runtime install
        await Bun.spawn([BunProc.which(), "install", "pyright"], {
          cwd: binDir,
          env: { ...process.env, BUN_BE_BUN: "1" },
        }).exited
      }

      binary = BunProc.which()
      args.push("run", js)
    }

    args.push("--stdio")

    // Virtual environment detection
    const venvPaths = [process.env.VIRTUAL_ENV, path.join(root, ".venv"), path.join(root, "venv")].filter(Boolean)
    const initialization: Record<string, string> = {}

    for (const venv of venvPaths) {
      const pythonPath = path.join(venv, process.platform === "win32" ? "Scripts/python.exe" : "bin/python")
      if (await Filesystem.exists(pythonPath)) {
        initialization["pythonPath"] = pythonPath
        break
      }
    }

    return {
      process: spawn(binary, args, { cwd: root }),
      initialization,
    }
  },
}
```

### Key Benefits

- **Lazy installation**: Only download what you actually use
- **Lightweight**: No upfront baggage
- **Per-user cache**: Shared across all projects
- **Graceful fallback**: Disabled if download blocked

### Disabling Auto-Downloads

Set environment variable to prevent automatic installs:

```ts
const allowDownload = process.env.MYAPP_DISABLE_LSP_DOWNLOAD !== "true"

if (!allowDownload) return // Skip download
```

This lets users opt-out of auto-downloads if they prefer manual installation.

---

## Adding Custom Servers

Configure via JSON:

```json
{
  "lsp": {
    "my-custom-server": {
      "command": ["my-server", "--stdio"],
      "extensions": [".custom"],
      "env": {
        "CUSTOM_VAR": "value"
      },
      "initialization": {
        "serverSetting": "value"
      }
    }
  }
}
```

At runtime:

```ts
servers[name] = {
  id: name,
  extensions: config.extensions,
  spawn: async (root) => {
    return {
      process: spawn(config.command[0], config.command.slice(1), {
        cwd: root,
        env: { ...process.env, ...config.env },
      }),
      initialization: config.initialization,
    }
  },
}
```

---

## LSP Operations

Execute operations against active clients:

```ts
// Hover information
async hover(file, line, char) {
  return client.sendRequest("textDocument/hover", {
    textDocument: { uri: pathToFileURL(file).href },
    position: { line, character: char }
  })
}

// Go to definition
async definition(file, line, char) {
  return client.sendRequest("textDocument/definition", {
    textDocument: { uri },
    position: { line, character: char }
  })
}

// Find references
async references(file, line, char) {
  return client.sendRequest("textDocument/references", {
    textDocument: { uri },
    position: { line, character: char },
    context: { includeDeclaration: true }
  })
}

// Document symbols
async documentSymbols(uri) {
  return client.sendRequest("textDocument/documentSymbol", {
    textDocument: { uri }
  })
}

// Workspace symbols
async workspaceSymbols(query) {
  return client.sendRequest("workspace/symbol", { query })
}
```

---

## Full Example

Minimal working LSP manager:

```ts
class LanguageServerManager {
  clients = new Map<string, Promise<any>>()

  async getClient(file) {
    const key = this.getServerKey(file)
    if (this.clients.has(key)) {
      return this.clients.get(key)
    }

    const promise = this.spawnClient(file)
    this.clients.set(key, promise)
    return promise
  }

  async spawnClient(file) {
    const server = this.findServer(file)
    if (!server) throw new Error("No LSP server for this file")

    const root = await server.root(file)
    const { process, initialization } = await server.spawn(root)

    const connection = createMessageConnection(
      new StreamMessageReader(process.stdout),
      new StreamMessageWriter(process.stdin),
    )

    connection.listen()
    await connection.sendRequest("initialize", {
      rootUri: pathToFileURL(root).href,
      capabilities: this.getCapabilities(),
      initializationOptions: initialization,
    })
    await connection.sendNotification("initialized", {})

    return { connection, root, notify: this.createNotify(connection) }
  }

  async hover(file, line, char) {
    const client = await this.getClient(file)
    return client.connection.sendRequest("textDocument/hover", {
      textDocument: { uri: pathToFileURL(file).href },
      position: { line, character: char },
    })
  }
}
```

---

## Key Dependencies

- `vscode-jsonrpc`: JSON-RPC 2.0 implementation over streams
- `vscode-languageserver-types`: TypeScript types for LSP
- `child_process`: Spawning server processes
- `path`: File/URL path manipulation
