import { defineConfig } from 'vitest/config';
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  optimizeDeps: {
    exclude: ['lucide-solid']
  },
  define: {
    'import.meta.vitest': 'undefined'
  }
});
