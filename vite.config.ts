import { defineConfig } from "vite-plus";
import { configDefaults } from "vite-plus/test/config";

export default defineConfig({
  fmt: {
    ignorePatterns: [".repos/**", ".zed/**", "apps/renderer/src/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: [".repos/**", "apps/renderer/src/routeTree.gen.ts"],
    plugins: ["typescript"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    jsPlugins: [
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
