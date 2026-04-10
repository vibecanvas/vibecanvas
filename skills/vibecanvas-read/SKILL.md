---
name: vibecanvas-read
description: Readonly Vibecanvas CLI help for listing canvases and querying canvas state. Use when you need the vibecanvas read help menu for list and query commands.
---

# Vibecanvas Read

Assume `vibecanvas` is installed and available on PATH.

Prefer these commands for readonly work:

- `vibecanvas canvas list`
- `vibecanvas canvas query`

Prefer `--json` when the result will be parsed.

## Canvas help

```text
Usage: vibecanvas canvas <command> [options]

Canvas commands:
  list                                         List canvases in the selected database
  query (--canvas <id> | --canvas-name <query>) [selectors]
                                                Run a structured readonly canvas query
  add (--canvas <id> | --canvas-name <query>) [element source]
                                                Add primitive elements to one canvas
  patch ...                                    Patch explicit element/group ids with structured field updates
  move ...                                     Move explicit element/group ids deterministically
  group ...                                    Group matching elements
  ungroup ...                                  Ungroup a group
  delete (--canvas <id> | --canvas-name <query>) --id <id>...
                                                Permanently delete elements/groups; deleting a group cascades to descendants
  reorder (--canvas <id> | --canvas-name <query>) --id <id>... --action <front|back|forward|backward>
                                                Reorder sibling zIndex for explicit element/group ids

Dispatch order:
  1. Try local API server first when --db is not passed
  2. Fall back to direct command execution when no server is found
  3. Use --db to force direct local database access

Shared options:
  --db <path>   Optional explicit SQLite file override; otherwise falls back to configured/default storage
  --dry-run     Validate and preview mutation results without mutating the canvas
  --json        Emit machine-readable errors/output
  --help, -h    Show this help message

Database path precedence:
  1. --db <path>
  2. VIBECANVAS_DB
  3. VIBECANVAS_CONFIG
  4. default dev/prod storage resolution

Next steps:
  1. vibecanvas canvas list --json
  2. vibecanvas canvas query --canvas <canvas-id> --json
  3. vibecanvas canvas add --canvas <canvas-id> --element '{"type":"rect","x":10,"y":20}' --json

Notes:
  - --db is optional; when omitted the CLI falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.
  - --db must point to a single SQLite file.
  - Missing or duplicate --db flags fail before the CLI imports SQLite or Automerge state.
  - list never depends on a selected/default canvas; it always enumerates every canvas in the opened db.
  - Use 'vibecanvas canvas <subcommand> --help' for command-specific arguments and examples.
```

## List help

```text
Usage: vibecanvas canvas list [options]

List every canvas row in the opened local database.

Options:
  --db <path>   Optional explicit SQLite file override; otherwise falls back to configured/default storage
  --json        Emit machine-readable success output
  --help, -h    Show this help message

Output:
  Text mode prints one inventory line per canvas.
  JSON mode prints { ok, command, subcommand, dbPath, count, canvases[] }.

Ordering:
  Canvases are ordered deterministically by createdAt, then name, then id.

Notes:
  - list never depends on a selected/default canvas.
  - when --db is omitted, the command falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.
```

## Query help

```text
Usage: vibecanvas canvas query [options]

Query elements and groups inside one selected canvas using structured selectors only.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Selector inputs (choose at most one style):
  Structured flags:
    --id <id>               Match exact element/group ids (repeatable)
    --kind <kind>           element | group (repeatable)
    --type <type>           Match persisted element types only (repeatable)
    --style <key=value>     Match exact persisted element style values (repeatable)
    --group <group-id>      Match direct children of one parent group
    --subtree <group-id>    Match the root group plus all nested descendants
    --bounds <x,y,w,h>      Match computed persisted bounds
    --bounds-mode <mode>    intersects | contains (default: intersects)

  --where <querystring>     Same selector fields encoded as query params
                             Example: "type=rect&style.backgroundColor=%23ff0000&subtree=group-root&bounds=0,0,500,400"

  --query <json>            JSON object with { ids, kinds, types, style, group, subtree, bounds, boundsMode }

Options:
  --output <mode>           summary | focused | full (default: summary)
  --omitdata                Exclude data subfields from query results
  --omitstyle               Exclude style subfields from query results
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output modes:
  summary   compact per-match metadata and summary payloads
  focused   summary fields plus child/detail fields for each match
  full      the full persisted target record plus the query envelope

Notes:
  - query is strictly readonly and never mutates the document.
  - query never performs natural-language parsing.
  - pass at most one selector input style: structured flags, --where, or --query.
  - --group matches direct children only.
  - --subtree includes the root group and all nested descendants.
  - group bounds are derived from descendant elements; empty groups do not match bounds filters.
  - when --db is omitted, query falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.

Examples:
  vibecanvas canvas query --canvas 3d3f... --type rect --output summary
  vibecanvas canvas query --canvas-name design --where "subtree=group-root&type=text" --json
  vibecanvas canvas query --canvas 3d3f... --style backgroundColor=#ff0000 --json
  vibecanvas canvas query --canvas 3d3f... --query '{"bounds":{"x":0,"y":0,"w":800,"h":600}}' --json
```
