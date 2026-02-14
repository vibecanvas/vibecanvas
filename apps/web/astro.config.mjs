import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";

export default defineConfig({
  output: "static",
  site: "https://vibecanvas.dev",
  integrations: [mdx(), solid()],
  redirects: {
    "/install": {
      status: 302,
      destination: "https://raw.githubusercontent.com/vibecanvas/vibecanvas/refs/heads/main/scripts/install.sh",
    },
  },
});
