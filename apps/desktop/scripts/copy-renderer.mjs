import * as NodeFS from "node:fs/promises";
import * as NodePath from "node:path";
import { fileURLToPath } from "node:url";

const desktopDirectory = NodePath.resolve(NodePath.dirname(fileURLToPath(import.meta.url)), "..");
const rendererSource = NodePath.resolve(desktopDirectory, "../renderer/dist");
const rendererTarget = NodePath.resolve(desktopDirectory, "dist/renderer");

await NodeFS.rm(rendererTarget, { recursive: true, force: true });
await NodeFS.cp(rendererSource, rendererTarget, { recursive: true });
