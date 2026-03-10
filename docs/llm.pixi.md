# PixiJS Documentation for LLMs

> PixiJS is the fastest, most lightweight 2D library available for the web, working across all devices and allowing you to create rich, interactive graphics and cross-platform applications using WebGL and WebGPU.

This file contains links to documentation sections following the llmstxt.org standard.

## Table of Contents

- [Ecosystem](pixi/llm.pixi.ecosystem.md): Explore the PixiJS ecosystem, including libraries, tools, and community-driven projects that enhance PixiJS applications.
- [Quick Start](pixi/llm.pixi.quick-start.md): A step-by-step guide to quickly set up a PixiJS project and start creating graphics and animations.
- [Architecture](pixi/llm.pixi.architecture.md): A comprehensive guide to the architecture of PixiJS, including its major components and extension system.
- [Environments](pixi/llm.pixi.environments.md): Learn how PixiJS adapts to different environments like browsers, Web Workers, and custom execution contexts, and how to configure it for your needs.
- [Garbage Collection](pixi/llm.pixi.garbage-collection.md): Managing GPU resources and garbage collection in PixiJS for optimal performance.
- [Performance Tips](pixi/llm.pixi.performance-tips.md): Performance tips for optimizing PixiJS applications, covering general practices and specific techniques for maximizing rendering efficiency.
- [Render Groups](pixi/llm.pixi.render-groups.md): Learn how to use Render Groups in PixiJS to optimize rendering performance by grouping scene elements for efficient GPU processing.
- [Render Layers](pixi/llm.pixi.render-layers.md): Understanding PixiJS Render Layers for controlling rendering order independently of logical hierarchy.
- [Render Loop](pixi/llm.pixi.render-loop.md): Understanding the PixiJS render loop, including how it updates the scene graph and renders frames efficiently.
- [Scene Graph](pixi/llm.pixi.scene-graph.md): Understanding the PixiJS scene graph, its structure, and how to manage parent-child relationships, render order, and culling for optimal performance.
- [Accessibility](pixi/llm.pixi.accessibility.md): Learn how to use PixiJS's built-in accessibility features to make your applications more inclusive for users with disabilities.
- [Color](pixi/llm.pixi.color.md): Learn how to use the Color class in PixiJS for color manipulation, including various formats like hex, RGB, and named colors.
- [Events / Interaction](pixi/llm.pixi.events.md): Learn how to use PixiJS's event system for handling user interactions, including mouse and touch events, and how to customize event behavior.
- [Filters / Blend Modes](pixi/llm.pixi.filters.md): Learn how to use PixiJS filters and blend modes to apply post-processing effects and advanced compositing in your PixiJS applications.
- [Math](pixi/llm.pixi.math.md): Learn how to use PixiJS math utilities for 2D transformations, geometry, and shape manipulation, including optional advanced methods.
- [Textures](pixi/llm.pixi.textures.md): Learn how PixiJS handles textures, their lifecycle, creation, and types, including how to manage GPU resources effectively.
- [Ticker](pixi/llm.pixi.ticker.md): Learn how to use the Ticker class in PixiJS for managing game loops, animations, and time-based updates.
- [Mixing PixiJS and Three.js](pixi/llm.pixi.mixing-three-and-pixi.md): Learn how to combine PixiJS and Three.js to create dynamic applications that leverage both 2D and 3D graphics.
- [v8 Migration Guide](pixi/llm.pixi.v8.md): PixiJS v8 Migration Guide - Transitioning from PixiJS v7 to v8
- [Bug Bounty Program](pixi/llm.pixi.bug-bounty.md): PixiJS is committed to delivering a reliable, high-performance rendering engine for the web. To support that mission, we’re launching a **Bug Bount...
- [FAQ](pixi/llm.pixi.faq.md): Frequently Asked Questions about PixiJS
- [Culler Plugin](pixi/llm.pixi.culler-plugin.md): Learn how to use the CullerPlugin in PixiJS to optimize rendering by skipping offscreen objects.
- [Application](pixi/llm.pixi.application.md): Learn how to create and configure a PixiJS Application, including options for WebGL/WebGPU rendering, built-in plugins, and custom application plug...
- [Resize Plugin](pixi/llm.pixi.resize-plugin.md): Learn how to use the Resize Plugin in PixiJS to make your application responsive to window or element size changes.
- [Ticker Plugin](pixi/llm.pixi.ticker-plugin.md): Learn how to use the TickerPlugin in PixiJS for efficient rendering and updates in your application.
- [Background Loader](pixi/llm.pixi.background-loader.md): Learn how to use the PixiJS background loader to load assets in the background, improving application responsiveness and reducing initial loading t...
- [Compressed Textures](pixi/llm.pixi.compressed-textures.md): Learn how to use compressed textures in PixiJS for efficient memory usage and GPU performance.
- [Assets](pixi/llm.pixi.assets.md): Learn how to manage and load assets in PixiJS using the Assets API.
- [Manifests & Bundles](pixi/llm.pixi.manifest.md): Learn how to manage assets in PixiJS using Manifests and Bundles, and how to automate this process with AssetPack.
- [Resolver](pixi/llm.pixi.resolver.md): Learn how to use PixiJS's asset resolver for dynamic, multi-format asset loading with platform-aware optimizations.
- [SVG's](pixi/llm.pixi.svg.md): Learn how to render SVGs in PixiJS, including using them as textures or graphics, and understand their advantages and limitations.
- [Renderers](pixi/llm.pixi.renderers.md): Learn how to use PixiJS renderers for high-performance GPU-accelerated rendering in your applications.
- [Cache As Texture](pixi/llm.pixi.cache-as-texture.md): Learn how to use cacheAsTexture in PixiJS to optimize rendering performance by caching containers as textures. Understand its benefits, usage, and ...
- [Container](pixi/llm.pixi.container.md): Learn how to create and manage Containers in PixiJS, including adding/removing children, sorting, and caching as textures.
- [Graphics Fill](pixi/llm.pixi.graphics-fill.md): Learn how to use the `fill()` method in PixiJS to fill shapes with colors, textures, and gradients, enhancing your graphics and text rendering.
- [Graphics Pixel Line](pixi/llm.pixi.graphics-pixel-line.md): Learn how to use the `pixelLine` property in PixiJS Graphics API to create crisp, pixel-perfect lines that remain consistent under scaling and tran...
- [Graphics](pixi/llm.pixi.graphics.md): Learn how to use PixiJS Graphics to create shapes, manage graphics contexts, and optimize performance in your projects.
- [Scene Objects](pixi/llm.pixi.scene-objects.md): Learn how to use scene objects in PixiJS, including containers, sprites, transforms, and more. This guide covers the basics of building your scene ...
- [Mesh](pixi/llm.pixi.mesh.md): Learn how to create and manipulate meshes in PixiJS v8, including custom geometry, shaders, and built-in mesh types like MeshSimple, MeshRope, and ...
- [NineSlice Sprite](pixi/llm.pixi.nine-slice-sprite.md): Learn how to use the NineSliceSprite class in PixiJS for creating scalable UI elements with preserved corners and edges.
- [Particle Container](pixi/llm.pixi.particle-container.md): Learn how to use the ParticleContainer and Particle classes in PixiJS for high-performance particle systems.
- [Sprite](pixi/llm.pixi.sprite.md): Learn how to create and manipulate Sprites in PixiJS, including texture updates, scaling, and transformations.
- [Bitmap Text](pixi/llm.pixi.bitmap.md): Learn how to use BitmapText in PixiJS for high-performance text rendering with pre-generated texture atlases.
- [Text (Canvas)](pixi/llm.pixi.canvas.md): Learn how to use the Text class in PixiJS to render styled text as display objects, including dynamic updates and font loading.
- [HTML Text](pixi/llm.pixi.html.md): Learn how to use HTMLText in PixiJS to render styled HTML strings within your WebGL canvas, enabling complex typography and inline formatting.
- [Text](pixi/llm.pixi.text.md): Learn how to use PixiJS's text rendering classes `Text`, `BitmapText`, and `HTMLText`.
- [SplitText & SplitBitmapText](pixi/llm.pixi.split-text.md): The `SplitText` and `SplitBitmapText` classes let you break a string into individual lines, words, and characters—each as its own display object—un...
- [Text Style](pixi/llm.pixi.style.md): Learn how to use the TextStyle class in PixiJS to style text objects, including fills, strokes, shadows, and more.
- [Tiling Sprite](pixi/llm.pixi.tiling-sprite.md): Learn how to use the TilingSprite class in PixiJS for rendering repeating textures efficiently across a defined area.
