#!/usr/bin/env bun
import { createRuntime } from '@vibecanvas/runtime';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';

const runtime = createRuntime({
  plugins: [],
  hooks: createCliHooks(),
  config: {
    port: 3000,
    cwd: process.cwd(),
    dev: true,
  },
  boot: bootCliRuntime,
  shutdown: shutdownCliRuntime,
});

await runtime.boot();
console.log('vibecanvas ready (no plugins)');
