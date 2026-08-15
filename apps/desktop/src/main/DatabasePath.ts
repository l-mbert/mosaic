import * as NodePath from "node:path";

import * as Electron from "electron";

export const getDatabaseFilename = () =>
  NodePath.join(
    Electron.app.getPath("userData"),
    process.env.MOSAIC_DESKTOP_DEV === "1" ? "mosaic-development.sqlite" : "mosaic.sqlite",
  );
