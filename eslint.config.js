import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Server modules run only in the Worker; the SPA reaches them through /api. */
const serverOnly = {
  group: ["@/worker", "@/worker/*", "@/features/*/server", "@/features/*/server/*", "**/server/*", "../server", "./server/*"],
  message: "Server modules run in the Worker only. Call the API from browser code (src/lib/api.ts).",
};

/** The Worker must not pull in browser-only code (React, the browser Supabase client). */
const browserOnly = {
  group: ["react", "react-dom", "@tanstack/*", "@/components/*", "@/app/*", "@/lib/supabase/*", "@/lib/api", "**/components/*"],
  message: "Browser modules don't belong in the Worker bundle.",
};

export default defineConfig([
  globalIgnores([
    "dist/**",
    ".wrangler/**",
    "worker-configuration.d.ts",
    // Not application code: role skills and static design references.
    ".claude/**",
    "output/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023 },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/worker/**", "src/features/*/server/**"],
    extends: [reactHooks.configs.flat["recommended-latest"], reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": ["error", { patterns: [serverOnly] }],
      // shadcn/ui modules export variants and hooks next to components.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/worker/**/*.ts", "src/features/*/server/**/*.ts"],
    languageOptions: { globals: globals.serviceworker },
    rules: { "no-restricted-imports": ["error", { patterns: [browserOnly] }] },
  },
  {
    files: ["tests/**/*.ts", "supabase/tests/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
]);
