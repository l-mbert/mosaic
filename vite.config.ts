import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
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
  run: {
    cache: true,
  },
});
