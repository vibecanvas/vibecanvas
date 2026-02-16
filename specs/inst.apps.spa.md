---
description: Specifics for the SolidJS Single-Page Application (SPA) in apps/spa/
mode: subagent
---

# Apps: SPA

The SPA is the visual heart of Vibecanvas. It provides an infinite canvas for wireframing, chatting with agents, and exploring files.

## Tech Stack

- **SolidJS**: Reactive UI framework for granular, high-performance updates.
- **PixiJS (v8)**: 2D WebGL/WebGPU rendering engine for the infinite canvas.
- **Automerge**: CRDT for local-first state synchronization and real-time collaboration.
- **Kobalte**: Accessible UI component primitives.
- **Tailwind CSS (v4)**: Modern, terminal-style design system.
- **oRPC Client**: Type-safe WebSocket-based API communication.

## Core Features

### 1. Infinite Canvas (`src/features/canvas-crdt`)
The canvas is a high-performance surface where all visual elements live.
- **Hybrid Rendering**: Combines PixiJS (for shapes, lines, images) with DOM Overlays (for complex inputs like Chat windows and File Trees).
- **Command Pattern**: Interaction logic (drag, resize, select) is encapsulated in "Input Commands" following a Chain of Responsibility pattern.
- **Renderables**: Every object on the canvas is a "Renderable" that maps CRDT data to PixiJS Graphics/Containers.

### 2. Local-First Synchronization
- **DocHandle Lifecycle**: The SPA manages an Automerge `DocHandle`. Changes are applied locally via `handle.change()` and synced to the `server` over WebSockets.
- **Reactive Store**: The global SolidJS store (`src/store.ts`) mirrors essential backend data while keeping UI-only state (like active tool or sidebar visibility) separate.

### 3. Integrated Agent Chat (`src/features/chat`)
- Traditional chat interface that exists as a draggable, resizable card on the PixiJS canvas.
- Real-time message streaming from the `server` orchestration layer.

## Architecture

### Component vs Canvas
Vibecanvas uses a "DOM Overlay" strategy:
- **PixiJS** handles high-frequency visual updates (panning, zooming, shape dragging).
- **SolidJS Components** handle complex UI interactions (buttons, forms, chat messages) by being "teleported" or positioned exactly over the relevant world coordinates on the canvas.

### Data Flow
1. **User Interaction**: Triggered via Mouse/Keyboard.
2. **Input Command**: Processes the event, calculates the delta.
3. **Optimistic UI**: Immediately updates the PixiJS Renderable for 60fps feedback.
4. **CRDT Patch**: At the end of a gesture (e.g., `pointerup`), the command applies a change to the Automerge document.
5. **Network Sync**: Automerge pushes the binary change to the `server`.

## Development Guidelines

- **No Border Radius**: Follow the terminal-like design system (sharp corners).
- **Tree-shaking Icons**: Import icons directly from `lucide-solid/icons/icon-name`.
- **Throttling**: Throttle store updates during continuous interactions (like dragging) to prevent excessive SolidJS re-renders.
- **Coordinate Systems**: Distinguish between **Screen Space** (DOM pixels) and **World Space** (Canvas units). Use `canvas.app.stage.toLocal()` and `toGlobal()` to convert between them.
