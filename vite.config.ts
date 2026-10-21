import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `cloudflare()` runs src/worker in workerd during `vite dev` and builds the
// SPA and the Worker together, as configured in wrangler.jsonc.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Fixed port: it must match the Supabase redirect URLs and Google OAuth
  // origins, so fail rather than silently move to another port.
  server: { port: 3000, strictPort: true },
  // Never inline fonts as data: URIs: the CSP allows `font-src 'self'` only
  // (public/_headers). Other small assets keep Vite's default inlining.
  build: { assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/i.test(file) ? false : undefined) },
});
