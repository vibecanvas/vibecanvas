import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solidPlugin({
      solid: {
        isCustomElement: (tag: string) =>
          tag.startsWith("ic-") || tag.startsWith("sp-"),
      },
    }),
  ],
  server: {
    port: 3002,
  },
});
