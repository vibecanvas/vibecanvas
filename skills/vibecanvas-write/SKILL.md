---
name: vibecanvas-write
description: Vibecanvas CLI help for mutating canvas state. Use when you need the vibecanvas write help menu for add, patch, move, group, ungroup, and delete commands.
---

# Vibecanvas Write

Assume `vibecanvas` is installed and available on PATH.

Prefer these commands for write work:

- `vibecanvas canvas add`
- `vibecanvas canvas patch`
- `vibecanvas canvas move`
- `vibecanvas canvas group`
- `vibecanvas canvas ungroup`
- `vibecanvas canvas delete`

Prefer `--json` when the result will be parsed.
Use `vibecanvas canvas list` first when you need canvas names.
Use `vibecanvas canvas query` first when you need exact ids before a mutation.

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

## Add help

```text
Usage: vibecanvas canvas add [options]

Add primitive elements inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Element source (choose exactly one):
  --element <json>          Inline one element payload (repeatable)
  --elements-file <path>    Read a JSON array of element payloads from a file
  --elements-stdin          Read a JSON array of element payloads from stdin
  --rect <x,y,w,h>          Shorthand rect element (repeatable)
  --ellipse <x,y,rx,ry>     Shorthand ellipse element (repeatable)
  --diamond <x,y,w,h>       Shorthand diamond element (repeatable)
  --text <x,y,text>         Shorthand text element (repeatable)
  --line <x,y,x2,y2>        Shorthand line element (repeatable)
  --arrow <x,y,x2,y2>       Shorthand arrow element (repeatable)

Notes on ids:
  - do not pass element ids from agents for add flows.
  - add ignores input ids and creates fresh ids server-side.

Supported types:
  rect | ellipse | diamond | text | line | arrow

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview add result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --schema [type]           Print schema blocks sourced from canvas-doc.ts
  --help, -h                Show this help message

Notes:
  - add tries the local API server first when no --db flag is passed.
  - when no local API server is found, add falls back to direct command execution.
  - each payload must be a JSON object with at least a supported type.
  - --schema with no type prints all add schema blocks.
  - file/stdin sources must be a JSON array of element payload objects.
  - shorthand flags must use exact comma counts with no empty numeric segments.
  - --text shorthand must be exactly x,y,text.
  - shorthand flags can be mixed with each other, but not with --element/--elements-file/--elements-stdin.
```

## Patch help

```text
Usage: vibecanvas canvas patch [options]

Patch explicit element/group ids with structured field updates.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to patch (repeatable)

Patch source (choose exactly one):
  --patch <json>            Inline JSON patch payload
  --patch-file <path>       Read patch payload from a file
  --patch-stdin             Read patch payload from stdin

Patch envelope:
  Element targets expect:   {"element":{...}}
  Group targets expect:     {"group":{...}}

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview patch result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --schema [type]           Print schema blocks sourced from canvas-doc.ts
  --help, -h                Show this help message

Notes:
  - top-level patch keys must be element or group.
  - use element.data / element.style for nested element updates.
  - --schema with no type prints all patch schema blocks.
  - errors include a short hint and one likely next step.
```

## Move help

```text
Usage: vibecanvas canvas move [options]

Move explicit element or group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to move (repeatable)

Required mode (choose exactly one):
  --relative                Treat --x/--y as translation deltas
  --absolute                Treat --x/--y as the final target position

Required coordinates:
  --x <number>              Horizontal delta or absolute x target
  --y <number>              Vertical delta or absolute y target

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview move result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the move summary and changed ids.
  JSON mode prints { ok, command, dryRun, mode, input, delta, canvas, matchedCount, matchedIds, changedCount, changedIds }.

Notes:
  - repeated --id values move many targets while preserving relative positions.
  - group ids move their descendant elements; groups themselves do not store x/y positions.
  - overlapping targets are normalized so each changed element moves at most once.
  - --absolute currently requires exactly one target id.
```

## Group help

```text
Usage: vibecanvas canvas group [options]

Group explicit element ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element id to group (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview group result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the new group id and grouped child ids.
  JSON mode prints { ok, command, dryRun, canvas, matchedCount, matchedIds, group: { id, parentGroupId, childIds } }.

Notes:
  - grouping currently supports explicit element ids only.
  - all ids must share the same direct parentGroupId.
  - grouping preserves absolute element positions and only changes structure.
```

## Ungroup help

```text
Usage: vibecanvas canvas ungroup [options]

Ungroup explicit group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact group id to ungroup (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview ungroup result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints removed group ids and released child ids.
  JSON mode prints { ok, command, dryRun, canvas, matchedCount, matchedIds, removedGroupCount, removedGroupIds, releasedChildCount, releasedChildIds }.

Notes:
  - ungrouping currently supports explicit group ids only.
  - ungrouping preserves absolute element positions and only changes structure.
  - direct child groups are reparented to the removed group's parent.
```

## Delete help

```text
Usage: vibecanvas canvas delete [options]

Delete explicit element/group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to delete (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --dry-run                 Validate and preview delete result without mutating the canvas
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message
```
