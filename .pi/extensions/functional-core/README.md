# functional-core extension

Merged project-local pi extension for functional core file rules.

## What it does

This extension enforces the shared rules for:
- `fn.*.ts`
- `fx.*.ts`
- `tx.*.ts`

It blocks invalid `write` and `edit` tool calls before they hit disk.

## Included checks

### fn.*.ts
- ignore `fn.*.test.ts` files
- exported functions must start with `fx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, `tx.`, or is exactly `CONSTANTS`
- `CONSTANTS.ts` imports are allowed for shared local constants
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types

### fx.*.ts
- ignore `fx.*.test.ts` files
- exported functions must start with `fx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, or is exactly `CONSTANTS`
- `CONSTANTS.ts` imports are allowed for shared local constants
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- every `fx*` function must have exactly 2 params
- first param must be named `portal` and typed as `TPortal*`
- second param must be named `args` and typed as `TArgs*`

### tx.*.ts
- ignore `tx.*.test.ts` files
- exported functions must start with `tx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, `tx.`, or is exactly `CONSTANTS`
- `CONSTANTS.ts` imports are allowed for shared local constants
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- every `tx*` function must have exactly 2 params
- first param must be named `portal` and typed as `TPortal*`
- second param must be named `args` and typed as `TArgs*`

## CONSTANTS exception

All import forms from uppercase `CONSTANTS` are allowed, for example:

```ts
import MY_CONSTANTS from "./CONSTANTS";
import { a, b, c } from "./CONSTANTS";
import * as myconst from "../../folder/CONSTANTS";
```

The module leaf must be exactly `CONSTANTS`.

## Layout

```text
.pi/extensions/
└── functional-core/
    ├── README.md
    ├── index.ts
    ├── fn-check.ts
    ├── fx-check.ts
    ├── tx-check.ts
    ├── lib/
    │   └── runtime-global-usage.ts
    └── tests/
        └── runtime-global-usage.test.ts
```
