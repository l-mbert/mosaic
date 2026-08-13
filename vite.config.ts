import { defineConfig } from "vite-plus";
import { configDefaults } from "vite-plus/test/config";

export default defineConfig({
  fmt: {
    ignorePatterns: [".repos/**"],
  },
  lint: {
    ignorePatterns: [".repos/**"],
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
    ],
  },
  test: {
    exclude: [...configDefaults.exclude, ".repos/**", "**/.repos/**"],
  },
  run: {
    cache: true,
  },
});
