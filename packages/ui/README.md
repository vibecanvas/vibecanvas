# @vibecanvas/ui

Tiny shared types for hosted UI bundles.

This package should stay small.

It does not know official components.
It does not mount UI.
It does not fetch bundles.
It does not resolve anything.
It only defines the shape shared between host code and hosted UI packages.

## What it exports

- `THostedComponentManifest`
- `THostedComponentBundle`
- `THostedComponentBridge`

Source:
- `src/hosted-components.ts`

## Install / import

```json
{
  "dependencies": {
    "@vibecanvas/ui": "workspace:*"
  }
}
```

```ts
import type {
  THostedComponentManifest,
  THostedComponentBundle,
  THostedComponentBridge,
} from "@vibecanvas/ui";
```

## Manifest

Manifest is just metadata for one hosted UI bundle.

```ts
import type { THostedComponentManifest } from "@vibecanvas/ui";

const manifest: THostedComponentManifest = {
  id: "my-ui",
  version: "0.1.0",
  apiVersion: 1,
  permissions: ["component.chrome", "file.read"],
  defaultSize: {
    width: 420,
    height: 320,
  },
};
```

Fields:
- `id`: package or bundle id
- `version`: bundle version
- `apiVersion`: shared hosted-ui contract version
- `permissions`: strings requested by bundle
- `defaultSize`: optional preferred size

## Bundle

Bundle is manifest plus source files.

```ts
import type { THostedComponentBundle } from "@vibecanvas/ui";

const bundle: THostedComponentBundle = {
  manifest,
  source: {
    "main.ts": "export default {}",
    "main.css": "",
  },
};
```

`source` is a virtual file map.

## Bridge

Bridge is generic.

Host decides what bridge modules exist.
Hosted UI imports or uses what host exposes.

```ts
import type { THostedComponentBridge } from "@vibecanvas/ui";

const bridge: THostedComponentBridge = {
  "host:vibecanvas/component": {
    async setChrome() {
      return undefined;
    },
  },
};
```

Bridge values are:
- module key -> object
- function name -> async function

Keep args and return values serializable.

## Rule

If data crosses boundary between trusted host and hosted bundle, put the type here.

If code is runtime behavior, do not put it here.

## Related doc

- `packages/canvas/HOSTED_COMPONENTS_ARCHITECTURE.md`
