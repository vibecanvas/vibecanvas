# Vibecanvas Style Guide

Terminal-like design system using Tailwind CSS v4 with Stone base and Amber accents.

## Architecture

```
@theme { }           ← Custom fonts, radius reset
:root { }            ← Semantic tokens (light mode)
.dark { }            ← Semantic tokens (dark mode)
@theme inline { }    ← Maps semantic tokens → utilities
```

## Color System

Uses Tailwind's built-in **stone** and **amber** palettes. No custom colors defined.

### Semantic Tokens

Theme-aware colors that auto-switch with `.dark` class:

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | stone-50 | stone-950 | Page |
| `foreground` | stone-900 | stone-50 | Main text |
| `card` | stone-100 | stone-900 | Surfaces |
| `card-foreground` | stone-900 | stone-50 | Card text |
| `muted` | stone-200 | stone-800 | Subtle bg |
| `muted-foreground` | stone-600 | stone-400 | Secondary text |
| `primary` | amber-500 | amber-500 | Actions |
| `primary-foreground` | stone-950 | stone-950 | Button text |
| `secondary` | stone-200 | stone-800 | Alt actions |
| `accent` | amber-100 | stone-700 | Highlights |
| `destructive` | red-600 | red-500 | Danger |
| `success` | green-600 | green-500 | Success |
| `warning` | amber-600 | amber-400 | Warning |
| `border` | stone-300 | stone-800 | Borders |
| `input` | stone-300 | stone-800 | Form borders |
| `ring` | amber-500 | amber-500 | Focus ring |

## Usage

### Semantic Colors (Recommended)

```tsx
// Auto light/dark switching
<div class="bg-background text-foreground" />
<div class="bg-card text-card-foreground" />
<button class="bg-primary text-primary-foreground" />
```

### Raw Tailwind Colors

```tsx
// Direct palette access (no auto-switching)
<div class="bg-stone-800 text-stone-100" />
<span class="text-amber-500" />
```

## Components

### Primary Button

```tsx
<button class="bg-primary text-primary-foreground px-4 py-2 hover:bg-amber-600">
  Submit
</button>
```

### Secondary Button

```tsx
<button class="bg-secondary text-secondary-foreground px-4 py-2 hover:bg-stone-300 dark:hover:bg-stone-700">
  Cancel
</button>
```

### Ghost Button

```tsx
<button class="text-foreground px-4 py-2 hover:bg-accent hover:text-accent-foreground">
  Options
</button>
```

### Card

```tsx
<div class="bg-card text-card-foreground border border-border p-4">
  <h3 class="font-medium">Title</h3>
  <p class="text-muted-foreground text-sm">Description</p>
</div>
```

### Input

```tsx
<input
  class="bg-background border border-input text-foreground px-3 py-2
         placeholder:text-muted-foreground
         focus:outline-none focus:ring-2 focus:ring-ring"
  placeholder="Enter value..."
/>
```

### Badge

```tsx
<span class="bg-muted text-muted-foreground px-2 py-0.5 text-xs">Default</span>
<span class="bg-primary text-primary-foreground px-2 py-0.5 text-xs">New</span>
```

### Menu Item (Kobalte)

```tsx
<DropdownMenu.Item
  class="px-3 py-2 text-foreground cursor-pointer
         data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
>
  Item
</DropdownMenu.Item>
```

## Typography

| Utility | Font |
|---------|------|
| `font-mono` | JetBrains Mono Variable |
| `font-display` | Gabriele |

## Border Radius

All radii are **0px** (terminal aesthetic). `rounded-*` classes have no effect.

## Dark Mode

```tsx
document.documentElement.classList.toggle('dark');
```

## Best Practices

**DO:**
- Use semantic tokens (`bg-primary`) for UI
- Pair foregrounds (`bg-card text-card-foreground`)
- Use raw palette for data visualization

**DON'T:**
- Hardcode dark variants - let tokens handle it
- Use colors outside stone/amber palette
- Add border-radius
