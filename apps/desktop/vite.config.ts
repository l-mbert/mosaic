import { readFileSync } from "node:fs";

import { defineConfig } from "vite-plus";

const launchElectronAfterPack = process.env.MOSAIC_DESKTOP_DEV === "1";
const rawSqlPlugin = {
  name: "mosaic-raw-sql",
  load(id: string) {
    if (!id.endsWith(".sql?raw")) return null;
    const filename = id.slice(0, -"?raw".length);
    return `export default ${JSON.stringify(readFileSync(filename, "utf8"))};`;
  },
};

const mainPackConfig = {
  format: "cjs" as const,
  outDir: "dist",
  sourcemap: true,
  outExtensions: () => ({ js: ".cjs" }),
  entry: ["src/main.ts"],
  clean: true,
  deps: {
    alwaysBundle: (id: string) => id.startsWith("@mosaic/"),
  },
};

const mainPackConfigWithLaunch = {
  ...mainPackConfig,
  onSuccess: "node scripts/dev-electron.mjs",
};

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "vp pack && node scripts/copy-renderer.mjs",
        dependsOn: ["@mosaic/renderer#build"],
        cache: false,
      },
      dev: {
        command:
          "cross-env MOSAIC_DESKTOP_DEV=1 MOSAIC_RENDERER_DEV_URL=http://127.0.0.1:5173 vp pack --watch",
        cache: false,
      },
    },
  },
  pack: [
    launchElectronAfterPack ? mainPackConfigWithLaunch : mainPackConfig,
    {
      format: "cjs",
      outDir: "dist",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preload.ts"],
    },
    {
      format: "cjs",
      outDir: "dist",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/utility.ts"],
      plugins: [rawSqlPlugin],
      deps: {
        alwaysBundle: (id) => id.startsWith("@mosaic/"),
      },
    },
    {
      format: "cjs",
      outDir: "dist",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/seed.ts"],
      plugins: [rawSqlPlugin],
      deps: {
        alwaysBundle: (id) => id.startsWith("@mosaic/"),
      },
    },
  ],
});
