#!/usr/bin/env bun
import { createRuntime } from './plugin';

const runtime = createRuntime([], {
  port: 3000,
  cwd: process.cwd(),
  dev: true,
});

await runtime.boot();
console.log('vibecanvas ready (no plugins)');
