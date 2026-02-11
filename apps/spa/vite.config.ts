import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    devtools(),
    solidPlugin(),
    tailwindcss()
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/files': {
        target: 'http://localhost:3000'
      }
    }
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  optimizeDeps: {
    exclude: ['lucide-solid'],
    // Include Automerge packages for proper CJS/ESM interop
    include: [
      '@automerge/automerge',
      '@automerge/automerge-repo',
      '@automerge/automerge-repo-network-websocket',
      '@automerge/automerge-repo-network-broadcastchannel',
      '@automerge/automerge-repo-storage-indexeddb',
      'eventemitter3'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
