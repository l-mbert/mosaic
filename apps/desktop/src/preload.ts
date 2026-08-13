import { ipcRenderer } from "electron";

import { BACKEND_PORT_CHANNEL, BACKEND_PORT_MESSAGE } from "./shared/Channels.ts";

const windowLoaded = new Promise<void>((resolve) => {
  window.addEventListener("load", () => resolve(), { once: true });
});

ipcRenderer.on(BACKEND_PORT_CHANNEL, async (event) => {
  const [port] = event.ports;
  if (port === undefined) {
    return;
  }

  await windowLoaded;
  window.postMessage(BACKEND_PORT_MESSAGE, "*", [port]);
});
