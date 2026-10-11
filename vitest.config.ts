import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't start the Cloudflare plugin.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // The database tests boot an in-process Postgres (PGlite) per file.
    testTimeout: 30_000,
  },
});
