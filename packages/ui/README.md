# @vibecanvas/ui

Small SDK for Vibecanvas hosted UI packages.

Use it inside hosted Arrow UI code.

It gives end users:
- typed `api`
- typed `TVibecanvasManifest`
- typed tool button metadata
- helper to prepare Arrow sandbox source maps

## Example

```ts
import { component, html } from '@arrow-js/core'
import type { Props } from '@arrow-js/core'
import { api } from '@vibecanvas/ui'

type User = { id: string; name: string }

const UserName = component(
  async ({ id }: Props<{ id: string }>) => {
    const user = await api.users.get(id)
    return user.name
  },
  { fallback: html`<span>Loading user…</span>` }
)

export default component((props: Props<{ id: string }>) =>
  html`<article>${UserName(props)}</article>`
)
```

## Manifest

Create `vibecanvas.manifest.ts` beside your source.

```ts
import type { TVibecanvasManifest } from '@vibecanvas/ui'

export default {
  id: 'user-card',
  permissions: ['users.read'],
  toolButton: {
    icon: 'user',
    label: 'User Card',
  },
  defaultSize: {
    width: 280,
    height: 160,
  },
} satisfies TVibecanvasManifest
```

## Preparing sandbox source

Arrow sandbox wants:

```ts
source: Record<string, string>
```

Use `prepareVibecanvasSandboxSource()` after host reads package `src/` files.

```ts
import { prepareVibecanvasSandboxSource } from '@vibecanvas/ui'

const source = prepareVibecanvasSandboxSource({
  'main.ts': '...',
  'UserCard.ts': '...',
  'UserName.ts': '...',
  'main.css': '...',
})
```

This helper:
- checks there is exactly one `main.ts` or `main.js`
- rewrites `@vibecanvas/ui` imports to a sandbox shim
- injects `__vibecanvas_ui__.ts`

Host still must provide Arrow host bridge module:
- `host:vibecanvas/ui`

Expected bridge functions today:
- `getUser(id)`
- `listUsers()`

## Exports

- `api`
- `type TUser`
- `type TVibecanvasApi`
- `type TVibecanvasToolButton`
- `type TVibecanvasManifest`
- `prepareVibecanvasSandboxSource()`
- `createVibecanvasUiShimSource()`
- `type TVibecanvasSandboxSource`

## Notes

- `api` is host-provided at runtime
- permissions should match the API surface the host exposes
- this package stays small and author-facing
