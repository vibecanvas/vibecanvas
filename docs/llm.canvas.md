# User Guide

This guide explains how to use the Infinite Canvas Tutorial packages: `@infinite-canvas-tutorial/core` and `@infinite-canvas-tutorial/ecs`.

---

## Overview

### `@infinite-canvas-tutorial/core` (Legacy)

The original implementation with an object-oriented approach. **Note**: This package is no longer actively maintained since Lesson 18. Use the ECS package for new projects.

-   **Architecture**: Object-oriented
-   **Usage**: Simple, intuitive API suitable for beginners
-   **Status**: Legacy (maintenance mode)

### `@infinite-canvas-tutorial/ecs` (Recommended)

The modern implementation using Entity Component System (ECS) architecture with Becsy.

-   **Architecture**: Entity Component System
-   **Usage**: High performance, scalable, suitable for complex applications
-   **Status**: Active development
-   **Features**: Versioning with Epoch Semantic, modular plugins

---

## Installation

```bash
npm install @infinite-canvas-tutorial/ecs
# OR for legacy usage:
npm install @infinite-canvas-tutorial/core
```

---

## Quick Start

### Using ECS Package (Recommended)

```typescript
import {
    App,
    System,
    Commands,
    DefaultPlugins,
    system,
    PreStartUp,
} from '@infinite-canvas-tutorial/ecs';

// Define a startup system
class StartUpSystem extends System {
    private readonly commands = new Commands(this);

    initialize(): void {
        const canvas = this.commands.spawn(
            new Canvas({
                element: document.getElementById('canvas') as HTMLCanvasElement,
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            }),
        );

        const camera = this.commands.spawn(
            new Camera({ canvas: canvas.id() }),
            new Transform(),
        );

        const rect = this.commands.spawn(
            new Transform({ translation: { x: 100, y: 100 } }),
            new Renderable(),
            new FillSolid('#F67676'),
            new Rect({ x: 0, y: 0, width: 100, height: 100 }),
            new Visibility(),
        );

        camera.appendChild(rect);
        this.commands.execute();
    }
}

// Create plugin and run app
const MyPlugin = () => system(PreStartUp)(StartUpSystem);
const app = new App().addPlugins(...DefaultPlugins, MyPlugin);
app.run();
```

### Using Core Package (Legacy)

```typescript
import { Canvas, CanvasMode, Rect } from '@infinite-canvas-tutorial/core';

const canvas = await new Canvas({
    canvas: $canvas,
    mode: CanvasMode.SELECT,
}).initialized;

const rect = new Rect({
    x: 300,
    y: 100,
    width: 100,
    height: 100,
    fill: '#F67676',
});
canvas.appendChild(rect);
canvas.render();
```

---

## ECS Package API

### Core Classes

#### App

Main application entry point. Initializes the ECS world and runs all systems.

```typescript
const app = new App().addPlugins(...DefaultPlugins, MyPlugin);
app.run();
```

#### System

Base class for creating game logic systems.

```typescript
class MySystem extends System {
    execute(): void {
        // System logic runs every frame
    }
}
```

#### Commands

Utility for creating entities and modifying components.

```typescript
const commands = new Commands(this);
commands.spawn(component1, component2, ...);
commands.execute();
```

### Components

#### Canvas

Configures the rendering canvas.

```typescript
new Canvas({
    element: HTMLCanvasElement | OffscreenCanvas,
    width: number,
    height: number,
    renderer: 'webgl' | 'webgpu',
    devicePixelRatio: number,
});
```

#### Camera

Manages the viewport and camera transformations.

```typescript
new Camera({ canvas: entity });
```

#### Transform

2D transformation (position, scale, rotation).

```typescript
new Transform({
    translation: { x: number, y: number },
    scale: { x: number, y: number },
    rotation: number,
});
```

#### Renderable

Marks an entity for rendering.

```typescript
new Renderable();
```

#### FillSolid

Solid fill color.

```typescript
new FillSolid('red');
```

#### Stroke

Stroke styling.

```typescript
new Stroke({
  color: 'black',
  width: number,
  alignment: 'center' | 'inner' | 'outer',
  dasharray: number[]
})
```

#### Visibility

Controls visibility with inheritance.

```typescript
new Visibility();
value: 'visible' | 'hidden' | 'inherited';
```

#### Opacity

Controls transparency.

```typescript
new Opacity();
opacity: number; // 0-1
```

#### ZIndex

Controls rendering order.

```typescript
new ZIndex();
value: number;
```

### Shape Components

#### Rect

Rectangle shape.

```typescript
new Rect({
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number,
});
```

#### Circle

Circle shape.

```typescript
new Circle({
    cx: number,
    cy: number,
    r: number,
});
```

#### Path

SVG-like path.

```typescript
new Path({
    d: string, // SVG path data
});
```

#### Polyline

Connected line segments.

```typescript
new Polyline({
  points: [number, number][]
})
```

#### Text

Text rendering.

```typescript
new Text({
    x: number,
    y: number,
    content: string,
    fontSize: number,
    fontFamily: string,
});
```

#### Rough

Sketchy/hand-drawn style.

```typescript
new Rough();
```

### Hierarchy

Entities can be organized in parent-child relationships.

```typescript
parent.appendChild(child);
parent.read(Children).children;
child.read(Parent).parent;
```

### Reading/Writing Components

```typescript
// Read component
const transform = entity.read(Transform);

// Write component
entity.write(Transform).translation = { x: 100, y: 100 };
```

---

## Core Package API

### Shapes

-   **Rect**: Rectangle with x, y, width, height
-   **Circle**: Circle with cx, cy, r
-   **Ellipse**: Ellipse with cx, cy, rx, ry
-   **Path**: SVG path with d attribute
-   **Polyline**: Connected line segments
-   **Text**: Text with font properties
-   **Group**: Container for grouping shapes
-   **RoughCircle, RoughRect, RoughPath**: Hand-drawn style shapes

### Canvas

```typescript
const canvas = new Canvas({
    canvas: HTMLCanvasElement,
    mode: CanvasMode.SELECT | CanvasMode.PAN | CanvasMode.DRAW,
    renderer: 'webgl' | 'webgpu',
});
```

### Common Shape Properties

All shapes support these properties:

-   `fill`: Fill color or gradient
-   `stroke`: Stroke color
-   `strokeWidth`: Line width
-   `opacity`: Transparency (0-1)
-   `dropShadow`: Shadow configuration
-   `transform`: Position, scale, rotation
-   `batchable`: Optimize for batch rendering
-   `wireframe`: Show wireframe for debugging

---

## System Stages (ECS)

Systems can be scheduled at different stages:

-   **PreStartUp**: Before app initializes
-   **StartUp**: During app initialization
-   **PostStartUp**: After app initialization

```typescript
import {
    system,
    PreStartUp,
    StartUp,
    PostStartUp,
} from '@infinite-canvas-tutorial/ecs';

const MyPlugin = () => {
    system(PreStartUp)(StartUpSystem);
    system(StartUp)(MainSystem);
    system(PostStartUp)(FinalSystem);
};
```

---

## Built-in Plugins

ECS package includes these plugins:

1. **HierarchyPlugin**: Parent-child relationships
2. **TransformPlugin**: 2D transformations
3. **CanvasPlugin**: Canvas rendering
4. **CameraPlugin**: Camera controls
5. **EventPlugin**: Event handling
6. **CullingPlugin**: Viewport culling optimization
7. **RendererPlugin**: WebGL/WebGPU rendering
8. **ScreenshotPlugin**: Export to image
9. **PenPlugin**: Drawing tools
10. **HTMLPlugin**: HTML overlay support

---

## Common Recipes

### Resize with Window

**ECS:**

```typescript
window.addEventListener('resize', () => {
    const canvasElement = document.getElementById(
        'canvas',
    ) as HTMLCanvasElement;

    canvasElement.width = window.innerWidth * window.devicePixelRatio;
    canvasElement.height = window.innerHeight * window.devicePixelRatio;

    Object.assign(canvasEntity.write(Canvas), {
        width: window.innerWidth,
        height: window.innerHeight,
    });
});
```

**Core:**

```typescript
window.addEventListener('resize', () => {
    canvas.resize(window.innerWidth, window.innerHeight);
});
```

### Pan Camera with Mouse

```typescript
// Read mouse events and update camera transform
cameraEntity.write(Transform).translation = { x: newX, y: newY };
```

### Create Nested Shapes

**ECS:**

```typescript
const parent = commands.spawn(
    new Transform(),
    new FillSolid('red'),
    new Circle({ cx: 0, cy: 0, r: 100 }),
);
const child = commands.spawn(
    new Transform(),
    new FillSolid('blue'),
    new Rect({ x: 50, y: 50, width: 50, height: 50 }),
);

parent.appendChild(child);
```

**Core:**

```typescript
const parent = new Group({ x: 100, y: 100 });
const child = new Rect({ x: 0, y: 0, width: 50, height: 50, fill: 'red' });

parent.appendChild(child);
canvas.appendChild(parent);
```

### Add Drop Shadow

**ECS:**

```typescript
commands.spawn(
    new Renderable(),
    new DropShadow({
        color: 'rgba(0, 0, 0, 0.5)',
        blurRadius: 10,
        offsetX: 10,
        offsetY: 10,
    }),
    new Rect({ x: 0, y: 0, width: 100, height: 100 }),
    new FillSolid('red'),
);
```

**Core:**

```typescript
new Rect({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fill: 'red',
    dropShadowBlurRadius: 10,
    dropShadowColor: 'rgba(0, 0, 0, 0.5)',
    dropShadowOffsetX: 10,
    dropShadowOffsetY: 10,
});
```

---

## Coordinate Systems

### Available Conversions

-   `client2Viewport(clientPoint)`: Convert DOM client coordinates to viewport
-   `viewport2Client(viewportPoint)`: Convert viewport to client coordinates
-   `viewport2Canvas(viewportPoint)`: Convert viewport to canvas coordinates
-   `canvas2Viewport(canvasPoint)`: Convert canvas to viewport coordinates

---

## WebGPU Support

Both packages support WebGPU rendering. Enable with:

```typescript
renderer: 'webgpu';
shaderCompilerPath: '/path/to/glsl_wgsl_compiler_bg.wasm';
```

---

## Examples

-   **ECS Example**: `packages/ecs/examples/main.ts`
-   **Core Example**: `packages/core/examples/main.ts`

---

## Project Structure

### ECS Package

```
src/
├── plugins/          # Built-in system plugins
├── components/       # Component definitions
├── systems/          # System implementations
├── environment/      # Browser/WebWorker environments
├── shaders/          # GLSL/WGSL shaders
└── drawcalls/        # Rendering logic
```

### Core Package

```
src/
├── shapes/          # Shape implementations
├── Canvas.ts        # Main canvas class
├── Camera.ts        # Camera implementation
└── plugins/         # Feature plugins
```

---

## Migration Guide (Core → ECS)

| Concept          | Core                          | ECS                                    |
| ---------------- | ----------------------------- | -------------------------------------- |
| Shape instance   | `new Rect({...})`             | `commands.spawn(new Rect({...}), ...)` |
| Append to parent | `parent.appendChild(child)`   | `parent.appendChild(child)`            |
| Transform        | `shape.x, shape.y`            | `entity.write(Transform).translation`  |
| Styling          | `shape.fill`                  | `entity.read(FillSolid).value`         |
| Events           | `shape.addEventListener(...)` | EventPlugin/Event system               |

---

## Troubleshooting

### System Execution Order

In DEV environment, check console for system execution order to debug dependencies.

### Performance Tips

1. Enable CullingPlugin for large scenes
2. Use batchable option where possible
3. Check wireframes for debugging
4. Monitor Entity count

---

## License

MIT

---

## Resources

-   [GitHub Repository](https://github.com/xiaoiver/infinite-canvas-tutorial)
-   [Becsy ECS Documentation](https://lastolivegames.github.io/becsy/)
-   [WebGPU Documentation](https://webgpu.github.io/webgpu-samples/)
