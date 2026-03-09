# Infinite Canvas Tutorial - User Guide

A high-performance 2D canvas library with WebGL/WebGPU rendering, built-in drawing tools, and infinite pan/zoom capabilities.

---

## Quick Start

### Installation

```bash
npm install @infinite-canvas-tutorial/core
# OR for ECS architecture (recommended)
npm install @infinite-canvas-tutorial/ecs
```

### Basic Usage (Core Package)

```typescript
import {
    Canvas,
    CanvasMode,
    Rect,
    Circle,
} from '@infinite-canvas-tutorial/core';

const canvas = await new Canvas({
    canvas: document.getElementById('canvas') as HTMLCanvasElement,
    mode: CanvasMode.SELECT,
    renderer: 'webgl',
}).initialized;

// Add shapes
const rect = new Rect({
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    fill: '#FF6B6B',
});
canvas.appendChild(rect);

canvas.render();
```

### Basic Usage (ECS Package - Recommended)

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

---

## Packages

### Core (Legacy)

The original object-oriented implementation. Simple and intuitive for basic use cases.

```typescript
import {
    Canvas,
    CanvasMode,
    Rect,
    Circle,
    Ellipse,
    Path,
    Polyline,
    Text,
    Group,
} from '@infinite-canvas-tutorial/core';
```

### ECS (Recommended)

Modern implementation using Entity Component System architecture. High performance and scalable.

```typescript
import {
    App,
    System,
    Commands,
    DefaultPlugins,
    system,
    PreStartUp,
    StartUp,
    PostStartUp,
} from '@infinite-canvas-tutorial/ecs';
```

---

## Core Package API

### Canvas

```typescript
const canvas = await new Canvas({
    canvas: HTMLCanvasElement,
    mode: CanvasMode.SELECT | CanvasMode.PAN | CanvasMode.DRAW,
    renderer: 'webgl' | 'webgpu',
    width: number,
    height: number,
    devicePixelRatio: number,
}).initialized;

// Methods
canvas.appendChild(shape);
canvas.removeChild(shape);
canvas.render();
canvas.resize(width, height);
canvas.exportToDataURL();
canvas.toSVG();
```

### Canvas Mode

```typescript
enum CanvasMode {
    SELECT = 'select', // Select and transform shapes
    PAN = 'pan', // Pan the canvas
    DRAW = 'draw', // Draw shapes
}
```

---

## Shape Types (Core)

### Rect

```typescript
const rect = new Rect({
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number,
    fill: string,
    stroke: string,
    strokeWidth: number,
});
```

### Circle

```typescript
const circle = new Circle({
    cx: number,
    cy: number,
    r: number,
});
```

### Ellipse

```typescript
const ellipse = new Ellipse({
    cx: number,
    cy: number,
    rx: number,
    ry: number,
});
```

### Path

```typescript
const path = new Path({
    d: string, // SVG path data, e.g., "M10 10 L90 90 L10 90 Z"
});
```

### Polyline

```typescript
const polyline = new Polyline({
    points: [number, number][],  // [[x1,y1], [x2,y2], ...]
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
});
```

### Text

```typescript
const text = new Text({
    x: number,
    y: number,
    content: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: string,
    fontStyle: string,
    textAlign: 'left' | 'center' | 'right',
    textBaseline: 'alphabetic' | 'middle' | 'top' | 'bottom',
});
```

### Group

```typescript
const group = new Group();
group.appendChild(shape);
group.removeChild(shape);
```

---

## Shape Properties (Core)

### Fill & Stroke

```typescript
rect.fill = '#FF6B6B';
rect.fill = 'none';
rect.fillOpacity = 0.5;

rect.stroke = '#000000';
rect.strokeWidth = 2;
rect.strokeOpacity = 0.8;
```

### Drop Shadow

```typescript
rect.dropShadowColor = 'rgba(0,0,0,0.5)';
rect.dropShadowOffsetX = 10;
rect.dropShadowOffsetY = 10;
rect.dropShadowBlurRadius = 20;
```

### Transform

```typescript
circle.position.x = 100;
circle.position.y = 100;

circle.scale.x = 2;
circle.scale.y = 1;

circle.rotation = Math.PI / 4; // radians
circle.angle = 90; // degrees

circle.pivot.x = 50;
circle.pivot.y = 50;

circle.skew.x = 0.1;
circle.skew.y = 0;
```

### Visibility & Interaction

```typescript
shape.visible = true;
shape.cursor = 'pointer';
shape.pointerEvents = 'visible'; // 'visible' | 'none' | 'auto'
shape.draggable = true;
shape.droppable = true;
shape.cullable = true;
shape.batchable = true;
```

---

## ECS Package API

### Core Classes

#### App

```typescript
const app = new App().addPlugins(...DefaultPlugins, MyPlugin);
app.run();
```

#### System

```typescript
class MySystem extends System {
    execute(): void {
        // Runs every frame
    }
}
```

#### Commands

```typescript
const commands = new Commands(this);
commands.spawn(component1, component2, ...);
commands.execute();
```

### Components

#### Canvas

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

```typescript
new Camera({ canvas: entity });
```

#### Transform

```typescript
new Transform({
    translation: { x: number, y: number },
    scale: { x: number, y: number },
    rotation: number,
});
```

#### Renderable

```typescript
new Renderable();
```

#### FillSolid

```typescript
new FillSolid('red');
```

#### Stroke

```typescript
new Stroke({
    color: 'black',
    width: number,
    alignment: 'center' | 'inner' | 'outer',
    dasharray: number[]
});
```

#### Visibility

```typescript
new Visibility();
value: 'visible' | 'hidden' | 'inherited';
```

#### Opacity

```typescript
new Opacity();
opacity: number; // 0-1
```

#### ZIndex

```typescript
new ZIndex();
value: number;
```

### Shape Components (ECS)

```typescript
// Rect
new Rect({ x: number, y: number, width: number, height: number });

// Circle
new Circle({ cx: number, cy: number, r: number });

// Path
new Path({ d: string });

// Polyline
new Polyline({ points: [number, number][] });

// Text
new Text({ x: number, y: number, content: string, fontSize: number, fontFamily: string });

// Rough (hand-drawn style)
new Rough();
```

### Hierarchy

```typescript
parent.appendChild(child);
parent.read(Children).children;
child.read(Parent).parent;
```

### Reading/Writing Components

```typescript
// Read
const transform = entity.read(Transform);

// Write
entity.write(Transform).translation = { x: 100, y: 100 };
```

---

## System Stages

Schedule systems at different phases:

```typescript
import {
    system,
    PreStartUp,
    StartUp,
    PostStartUp,
} from '@infinite-canvas-tutorial/ecs';

const MyPlugin = () => {
    system(PreStartUp)(StartUpSystem); // Before app initializes
    system(StartUp)(MainSystem); // During initialization
    system(PostStartUp)(FinalSystem); // After initialization
};
```

---

## Built-in Plugins

| Plugin             | Description                |
| ------------------ | -------------------------- |
| `HierarchyPlugin`  | Parent-child relationships |
| `TransformPlugin`  | 2D transformations         |
| `CanvasPlugin`     | Canvas rendering           |
| `CameraPlugin`     | Camera controls            |
| `EventPlugin`      | Event handling             |
| `CullingPlugin`    | Viewport culling           |
| `RendererPlugin`   | WebGL/WebGPU               |
| `ScreenshotPlugin` | Export to image            |
| `PenPlugin`        | Drawing tools              |
| `HTMLPlugin`       | HTML overlay               |

---

## Camera Control (Core)

```typescript
// Zoom
canvas.setZoom(2);
canvas.zoomIn();
canvas.zoomOut();

// Pan
canvas.setPan(x, y);

// Fit content
canvas.fitToScreen();

// Get camera state
const { zoom, x, y, rotation } = canvas.getCamera();
```

---

## Gradients

```typescript
// CSS gradient strings
rect.fill = 'linear-gradient(to right, red, blue)';
rect.fill = 'radial-gradient(circle, red, blue)';
rect.fill = 'conic-gradient(from 0deg, red, blue)';
```

---

## Arrow Markers

```typescript
polyline.stroke = '#000';
polyline.strokeWidth = 2;
polyline.markerEnd = 'arrow'; // 'arrow' | 'circle' | 'diamond'
polyline.markerStart = 'none';
polyline.markerFactor = 3;
```

---

## Rough Shapes

Hand-drawn/sketchy style:

```typescript
import {
    RoughRect,
    RoughCircle,
    RoughEllipse,
    RoughPath,
} from '@infinite-canvas-tutorial/core';

const roughRect = new RoughRect({
    x: 100,
    y: 100,
    width: 150,
    height: 100,
    fill: '#FF6B6B',
    stroke: '#000',
    strokeWidth: 2,
    roughBowing: 2,
    roughRoughness: 1,
    roughFillStyle: 'hachure', // 'hachure' | 'solid' | 'zigzag'
});
```

---

## Events

```typescript
shape.addEventListener('pointerdown', (e) => {});
shape.addEventListener('pointermove', (e) => {});
shape.addEventListener('pointerup', (e) => {});
shape.addEventListener('drag', (e) => {});
shape.addEventListener('click', (e) => {});
shape.addEventListener('dblclick', (e) => {});
```

---

## Export

```typescript
// Export to PNG
const dataURL = canvas.exportToDataURL();

// Export to SVG
const svg = canvas.toSVG();
```

---

## Resize Handler

```typescript
window.addEventListener('resize', () => {
    canvas.resize(window.innerWidth, window.innerHeight);
});
```

---

## WebGPU Support

Enable WebGPU rendering for better performance:

```typescript
// Core
const canvas = await new Canvas({
    canvas: element,
    renderer: 'webgpu',
    shaderCompilerPath: '/path/to/glsl_wgsl_compiler_bg.wasm',
}).initialized;

// ECS
const canvas = this.commands.spawn(
    new Canvas({
        element: document.getElementById('canvas'),
        renderer: 'webgpu',
        shaderCompilerPath: '/path/to/glsl_wgsl_compiler_bg.wasm',
    }),
);
```

---

## WebWorker Support

Run in WebWorker for better performance:

```typescript
import { DOMAdapter, WebWorkerAdapter } from '@infinite-canvas-tutorial/ecs';

DOMAdapter.set(WebWorkerAdapter);

const app = new App().addPlugins(...DefaultPlugins);
app.run();
```

---

## Complete Example

```typescript
import {
    Canvas,
    CanvasMode,
    Rect,
    Circle,
    Text,
    Ellipse,
} from '@infinite-canvas-tutorial/core';

async function main() {
    const canvas = await new Canvas({
        canvas: document.getElementById('canvas') as HTMLCanvasElement,
        mode: CanvasMode.SELECT,
        renderer: 'webgl',
    }).initialized;

    // Create shapes
    const rect = new Rect({
        x: 200,
        y: 200,
        width: 150,
        height: 100,
        fill: '#FF6B6B',
        stroke: '#333',
        strokeWidth: 2,
        cornerRadius: 8,
        dropShadowColor: 'rgba(0,0,0,0.3)',
        dropShadowOffsetX: 5,
        dropShadowOffsetY: 5,
        dropShadowBlurRadius: 10,
    });

    const circle = new Circle({
        cx: 500,
        cy: 250,
        r: 60,
        fill: '#4ECDC4',
    });

    const ellipse = new Ellipse({
        cx: 700,
        cy: 250,
        rx: 80,
        ry: 40,
    });

    const text = new Text({
        x: 200,
        y: 350,
        content: 'Infinite Canvas',
        fontSize: 32,
        fontFamily: 'Georgia',
        fill: '#333',
    });

    canvas.appendChild(rect);
    canvas.appendChild(circle);
    canvas.appendChild(ellipse);
    canvas.appendChild(text);

    // Fit content to screen
    canvas.fitToScreen();

    // Render
    canvas.render();

    // Handle resize
    window.addEventListener('resize', () => {
        canvas.resize(window.innerWidth, window.innerHeight);
    });

    // Add interactivity
    rect.addEventListener('click', () => {
        console.log('Rectangle clicked!');
    });
}

main();
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
