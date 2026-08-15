import * as NodeChildProcess from "node:child_process";
import * as NodePath from "node:path";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const desktopDirectory = NodePath.resolve(NodePath.dirname(fileURLToPath(import.meta.url)), "..");
const childEnvironment = { ...process.env };
delete childEnvironment.ELECTRON_RUN_AS_NODE;

const child = NodeChildProcess.spawn(electronPath, ["dist/main.cjs"], {
  cwd: desktopDirectory,
  env: childEnvironment,
  stdio: "inherit",
});

child.once("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
