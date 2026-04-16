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
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, `tx.`, is exactly `CONSTANTS`, or the imported runtime binding name is UPPER_CASE / underscore style
- `CONSTANTS.ts` imports are allowed for shared local constants
- UPPER_CASE runtime value imports like `THEME_STROKE_WIDTH_VALUE_MAP` are allowed from any module
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types

### fx.*.ts
- ignore `fx.*.test.ts` files
- exported functions must start with `fx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, is exactly `CONSTANTS`, or the imported runtime binding name is UPPER_CASE / underscore style
- `CONSTANTS.ts` imports are allowed for shared local constants
- UPPER_CASE runtime value imports like `THEME_STROKE_WIDTH_VALUE_MAP` are allowed from any module
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- exported `fx*` functions must have exactly 2 params
- exported `fx*` functions: first param must be named `portal` and typed as `TPortal*`
- exported `fx*` functions: second param must be named `args` and typed as `TArgs*`

### tx.*.ts
- ignore `tx.*.test.ts` files
- exported functions must start with `tx`
- imports must be type-only unless imported module leaf starts with `fn.`, `fx.`, `tx.`, is exactly `CONSTANTS`, or the imported runtime binding name is UPPER_CASE / underscore style
- `CONSTANTS.ts` imports are allowed for shared local constants
- UPPER_CASE runtime value imports like `THEME_STROKE_WIDTH_VALUE_MAP` are allowed from any module
- no direct use of runtime globals like `window`, `fetch`, `Bun`, `process`, `console`, `globalThis`
- do not export classes or other runtime values; only functions and types
- exported `tx*` functions must have exactly 2 params
- exported `tx*` functions: first param must be named `portal` and typed as `TPortal*`
- exported `tx*` functions: second param must be named `args` and typed as `TArgs*`

## CONSTANTS and UPPER_CASE import exceptions

All import forms from uppercase `CONSTANTS` are allowed, for example:

```ts
import MY_CONSTANTS from "./CONSTANTS";
import { a, b, c } from "./CONSTANTS";
import * as myconst from "../../folder/CONSTANTS";
```

The module leaf must be exactly `CONSTANTS`.

Runtime value imports are also allowed when the local imported binding name is UPPER_CASE / underscore style, for example:

```ts
import { THEME_STROKE_WIDTH_VALUE_MAP } from "@vibecanvas/service-theme";
import DEFAULT_THEME from "@vibecanvas/service-theme";
import * as THEME_VALUES from "@vibecanvas/service-theme";
import { themeMap as THEME_MAP } from "@vibecanvas/service-theme";
```

The allowed binding-name pattern is `^[A-Z0-9_]+$`.

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
