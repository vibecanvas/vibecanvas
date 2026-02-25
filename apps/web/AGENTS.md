# Web Docs App

Astro static site for Vibecanvas docs and landing page.

## Commands

```bash
bun --filter @vibecanvas/web dev
bun --filter @vibecanvas/web build
bun --filter @vibecanvas/web preview
```

## Stack

- Astro (static output)
- SolidJS islands (`@astrojs/solid-js`)
- MDX docs (`@astrojs/mdx` + content collections)

## Content

- Landing page: `src/pages/index.astro`
- Docs index: `src/pages/docs/index.astro`
- Docs route: `src/pages/docs/[...slug].astro`
- MDX files: `src/content/docs/*.mdx`

## Deploy

GitHub Pages workflow: `.github/workflows/deploy-web.yml`
