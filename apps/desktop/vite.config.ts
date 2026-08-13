import { defineConfig } from "vite-plus";

const launchElectronAfterPack = process.env.MOSAIC_DESKTOP_DEV === "1";

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
    {
      format: "cjs",
      outDir: "dist",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/main.ts"],
      clean: true,
      deps: {
        alwaysBundle: (id) => id.startsWith("@mosaic/"),
      },
      ...(launchElectronAfterPack ? { onSuccess: "node scripts/dev-electron.mjs" } : {}),
    },
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
      deps: {
        alwaysBundle: (id) => id.startsWith("@mosaic/"),
      },
    },
  ],
});
