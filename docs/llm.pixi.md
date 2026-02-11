# PixiJS Documentation for LLMs

> PixiJS is the fastest, most lightweight 2D library available for the web, working across all devices and allowing you to create rich, interactive graphics and cross-platform applications using WebGL and WebGPU.

This file contains links to documentation sections following the llmstxt.org standard.

## Table of Contents

- [Ecosystem](pixi/pixi.llm.ecosystem.md): Explore the PixiJS ecosystem, including libraries, tools, and community-driven projects that enhance PixiJS applications.
- [Quick Start](pixi/pixi.llm.quick-start.md): A step-by-step guide to quickly set up a PixiJS project and start creating graphics and animations.
- [Architecture](pixi/pixi.llm.architecture.md): A comprehensive guide to the architecture of PixiJS, including its major components and extension system.
- [Environments](pixi/pixi.llm.environments.md): Learn how PixiJS adapts to different environments like browsers, Web Workers, and custom execution contexts, and how to configure it for your needs.
- [Garbage Collection](pixi/pixi.llm.garbage-collection.md): Managing GPU resources and garbage collection in PixiJS for optimal performance.
- [Performance Tips](pixi/pixi.llm.performance-tips.md): Performance tips for optimizing PixiJS applications, covering general practices and specific techniques for maximizing rendering efficiency.
- [Render Groups](pixi/pixi.llm.render-groups.md): Learn how to use Render Groups in PixiJS to optimize rendering performance by grouping scene elements for efficient GPU processing.
- [Render Layers](pixi/pixi.llm.render-layers.md): Understanding PixiJS Render Layers for controlling rendering order independently of logical hierarchy.
- [Render Loop](pixi/pixi.llm.render-loop.md): Understanding the PixiJS render loop, including how it updates the scene graph and renders frames efficiently.
- [Scene Graph](pixi/pixi.llm.scene-graph.md): Understanding the PixiJS scene graph, its structure, and how to manage parent-child relationships, render order, and culling for optimal performance.
- [Accessibility](pixi/pixi.llm.accessibility.md): Learn how to use PixiJS's built-in accessibility features to make your applications more inclusive for users with disabilities.
- [Color](pixi/pixi.llm.color.md): Learn how to use the Color class in PixiJS for color manipulation, including various formats like hex, RGB, and named colors.
- [Events / Interaction](pixi/pixi.llm.events.md): Learn how to use PixiJS's event system for handling user interactions, including mouse and touch events, and how to customize event behavior.
- [Filters / Blend Modes](pixi/pixi.llm.filters.md): Learn how to use PixiJS filters and blend modes to apply post-processing effects and advanced compositing in your PixiJS applications.
- [Math](pixi/pixi.llm.math.md): Learn how to use PixiJS math utilities for 2D transformations, geometry, and shape manipulation, including optional advanced methods.
- [Textures](pixi/pixi.llm.textures.md): Learn how PixiJS handles textures, their lifecycle, creation, and types, including how to manage GPU resources effectively.
- [Ticker](pixi/pixi.llm.ticker.md): Learn how to use the Ticker class in PixiJS for managing game loops, animations, and time-based updates.
- [Mixing PixiJS and Three.js](pixi/pixi.llm.mixing-three-and-pixi.md): Learn how to combine PixiJS and Three.js to create dynamic applications that leverage both 2D and 3D graphics.
- [v8 Migration Guide](pixi/pixi.llm.v8.md): PixiJS v8 Migration Guide - Transitioning from PixiJS v7 to v8
- [Bug Bounty Program](pixi/pixi.llm.bug-bounty.md): PixiJS is committed to delivering a reliable, high-performance rendering engine for the web. To support that mission, we’re launching a **Bug Bount...
- [FAQ](pixi/pixi.llm.faq.md): Frequently Asked Questions about PixiJS
- [Culler Plugin](pixi/pixi.llm.culler-plugin.md): Learn how to use the CullerPlugin in PixiJS to optimize rendering by skipping offscreen objects.
- [Application](pixi/pixi.llm.application.md): Learn how to create and configure a PixiJS Application, including options for WebGL/WebGPU rendering, built-in plugins, and custom application plug...
- [Resize Plugin](pixi/pixi.llm.resize-plugin.md): Learn how to use the Resize Plugin in PixiJS to make your application responsive to window or element size changes.
- [Ticker Plugin](pixi/pixi.llm.ticker-plugin.md): Learn how to use the TickerPlugin in PixiJS for efficient rendering and updates in your application.
- [Background Loader](pixi/pixi.llm.background-loader.md): Learn how to use the PixiJS background loader to load assets in the background, improving application responsiveness and reducing initial loading t...
- [Compressed Textures](pixi/pixi.llm.compressed-textures.md): Learn how to use compressed textures in PixiJS for efficient memory usage and GPU performance.
- [Assets](pixi/pixi.llm.assets.md): Learn how to manage and load assets in PixiJS using the Assets API.
- [Manifests & Bundles](pixi/pixi.llm.manifest.md): Learn how to manage assets in PixiJS using Manifests and Bundles, and how to automate this process with AssetPack.
- [Resolver](pixi/pixi.llm.resolver.md): Learn how to use PixiJS's asset resolver for dynamic, multi-format asset loading with platform-aware optimizations.
- [SVG's](pixi/pixi.llm.svg.md): Learn how to render SVGs in PixiJS, including using them as textures or graphics, and understand their advantages and limitations.
- [Renderers](pixi/pixi.llm.renderers.md): Learn how to use PixiJS renderers for high-performance GPU-accelerated rendering in your applications.
- [Cache As Texture](pixi/pixi.llm.cache-as-texture.md): Learn how to use cacheAsTexture in PixiJS to optimize rendering performance by caching containers as textures. Understand its benefits, usage, and ...
- [Container](pixi/pixi.llm.container.md): Learn how to create and manage Containers in PixiJS, including adding/removing children, sorting, and caching as textures.
- [Graphics Fill](pixi/pixi.llm.graphics-fill.md): Learn how to use the `fill()` method in PixiJS to fill shapes with colors, textures, and gradients, enhancing your graphics and text rendering.
- [Graphics Pixel Line](pixi/pixi.llm.graphics-pixel-line.md): Learn how to use the `pixelLine` property in PixiJS Graphics API to create crisp, pixel-perfect lines that remain consistent under scaling and tran...
- [Graphics](pixi/pixi.llm.graphics.md): Learn how to use PixiJS Graphics to create shapes, manage graphics contexts, and optimize performance in your projects.
- [Scene Objects](pixi/pixi.llm.scene-objects.md): Learn how to use scene objects in PixiJS, including containers, sprites, transforms, and more. This guide covers the basics of building your scene ...
- [Mesh](pixi/pixi.llm.mesh.md): Learn how to create and manipulate meshes in PixiJS v8, including custom geometry, shaders, and built-in mesh types like MeshSimple, MeshRope, and ...
- [NineSlice Sprite](pixi/pixi.llm.nine-slice-sprite.md): Learn how to use the NineSliceSprite class in PixiJS for creating scalable UI elements with preserved corners and edges.
- [Particle Container](pixi/pixi.llm.particle-container.md): Learn how to use the ParticleContainer and Particle classes in PixiJS for high-performance particle systems.
- [Sprite](pixi/pixi.llm.sprite.md): Learn how to create and manipulate Sprites in PixiJS, including texture updates, scaling, and transformations.
- [Bitmap Text](pixi/pixi.llm.bitmap.md): Learn how to use BitmapText in PixiJS for high-performance text rendering with pre-generated texture atlases.
- [Text (Canvas)](pixi/pixi.llm.canvas.md): Learn how to use the Text class in PixiJS to render styled text as display objects, including dynamic updates and font loading.
- [HTML Text](pixi/pixi.llm.html.md): Learn how to use HTMLText in PixiJS to render styled HTML strings within your WebGL canvas, enabling complex typography and inline formatting.
- [Text](pixi/pixi.llm.text.md): Learn how to use PixiJS's text rendering classes `Text`, `BitmapText`, and `HTMLText`.
- [SplitText & SplitBitmapText](pixi/pixi.llm.split-text.md): The `SplitText` and `SplitBitmapText` classes let you break a string into individual lines, words, and characters—each as its own display object—un...
- [Text Style](pixi/pixi.llm.style.md): Learn how to use the TextStyle class in PixiJS to style text objects, including fills, strokes, shadows, and more.
- [Tiling Sprite](pixi/pixi.llm.tiling-sprite.md): Learn how to use the TilingSprite class in PixiJS for rendering repeating textures efficiently across a defined area.
