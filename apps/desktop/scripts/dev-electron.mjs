import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeNet from "node:net";
import * as NodePath from "node:path";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const desktopDirectory = NodePath.resolve(NodePath.dirname(fileURLToPath(import.meta.url)), "..");
const rendererUrl = process.env.MOSAIC_RENDERER_DEV_URL?.trim();

if (!rendererUrl) {
  throw new Error("MOSAIC_RENDERER_DEV_URL is required for desktop development.");
}

const renderer = new URL(rendererUrl);
const requiredFiles = ["main.cjs", "preload.cjs", "utility.cjs"];
const restartDebounceMs = 120;
let currentApp = null;
let restartTimer = null;
let shuttingDown = false;

const resourcesReady = () =>
  requiredFiles.every((file) => NodeFS.existsSync(NodePath.join(desktopDirectory, "dist", file)));

const rendererReady = () =>
  new Promise((resolve) => {
    const socket = NodeNet.connect({
      host: renderer.hostname,
      port: Number(renderer.port),
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });

while (!resourcesReady() || !(await rendererReady())) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const startApp = () => {
  if (shuttingDown || currentApp !== null) {
    return;
  }

  const childEnvironment = { ...process.env };
  delete childEnvironment.ELECTRON_RUN_AS_NODE;
  currentApp = NodeChildProcess.spawn(electronPath, ["dist/main.cjs"], {
    cwd: desktopDirectory,
    env: childEnvironment,
    stdio: "inherit",
  });
  currentApp.once("exit", () => {
    currentApp = null;
  });
};

const stopApp = () => {
  const app = currentApp;
  currentApp = null;
  app?.kill("SIGTERM");
};

const scheduleRestart = () => {
  if (shuttingDown) {
    return;
  }

  if (restartTimer !== null) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    stopApp();
    startApp();
  }, restartDebounceMs);
};

const watcher = NodeFS.watch(NodePath.join(desktopDirectory, "dist"), (_event, file) => {
  if (file && requiredFiles.includes(file)) {
    scheduleRestart();
  }
});

const shutdown = (code) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  watcher.close();
  stopApp();
  process.exit(code);
};

startApp();

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));
