import { defineConfig } from "vite-plus";
import { configDefaults } from "vite-plus/test/config";

const agentToolingIgnorePatterns = [
  ".agent/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".continue/**",
  ".cursor/**",
  ".gemini/**",
  ".opencode/**",
  ".pi/**",
  ".roo/**",
  ".windsurf/**",
  "tools/oxlint/anti-slop/**",
];

export default defineConfig({
  fmt: {
    ignorePatterns: [
      ".repos/**",
      ".zed/**",
      "apps/renderer/src/routeTree.gen.ts",
      ...agentToolingIgnorePatterns,
    ],
  },
  lint: {
    ignorePatterns: [
      ".repos/**",
      "apps/renderer/src/routeTree.gen.ts",
      ...agentToolingIgnorePatterns,
    ],
    plugins: ["typescript"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    jsPlugins: [
      {
        name: "anti-slop",
        specifier: "./tools/oxlint/anti-slop/index.ts",
      },
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    overrides: [
      {
        files: ["apps/temp-ui/**"],
        plugins: ["react", "oxc"],
        rules: {
          "react/rules-of-hooks": "error",
          "react/only-export-components": [
            "warn",
            {
              allowConstantExport: true,
              // shadcn ships its cva variants alongside the component.
              allowExportNames: [
                "badgeVariants",
                "buttonGroupVariants",
                "buttonVariants",
                "tabsListVariants",
                "toggleVariants",
              ],
            },
          ],
        },
      },
      {
        files: ["apps/renderer/**"],
        plugins: ["react", "oxc"],
        rules: {
          // TanStack file routes export route configuration beside their component.
          "react/only-export-components": "off",
          "react/rules-of-hooks": "error",
        },
      },
    ],
  },
  test: {
    exclude: [...configDefaults.exclude, ".repos/**", "**/.repos/**"],
  },
  run: {
    cache: true,
  },
});
