---
description: Specifics for the Documentation & Landing Page in apps/web/
mode: subagent
---

# Apps: Web

The Web app is the public-facing static presence of Vibecanvas. It hosts the documentation, landing page, and installation scripts.

## Tech Stack

- **Astro**: Static site generator.
- **MDX**: For content-rich documentation pages.
- **SolidJS**: Used for small interactive "islands" (like command tabs).
- **Tailwind CSS**: For styling.

## Key Content

### 1. Landing Page (`src/pages/index.astro`)
- Highlights the value proposition of Vibecanvas.
- Provides one-liner installation commands (curl, npm, bun).
- Showcases the visual/agent integration.

### 2. Documentation (`src/content/docs`)
- **Getting Started**: Initial setup and prerequisites.
- **Workflow Guides**: How to use the canvas with agents.
- **FAQ**: Common troubleshooting and community links.

### 3. Installation Scripts
- The Astro build process copies `scripts/install.sh` to the `public/` folder.
- This allows users to run `curl ... | bash` targeting `vibecanvas.dev/install`.

## Development Guidelines

- **Content Collections**: All documentation must live in `src/content/docs` as MDX files with appropriate frontmatter (title, description, order).
- **Islands Architecture**: Keep the JavaScript footprint small. Only use `client:load` for essential interactive elements like the `CommandTabs`.
- **Styling**: Ensure high contrast and readability for code snippets and command lines.
- **Deployment**: Automatically deployed via GitHub Actions (`deploy-web.yml`) to GitHub Pages.
