import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { pathToFileURL } from "node:url";

import { Context, Effect, Layer, Schema } from "effect";
import * as Electron from "electron";

type RendererLoaded = (webContents: Electron.WebContents) => void;

export class MainWindowError extends Schema.TaggedError<MainWindowError>()("MainWindowError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class MainWindow extends Context.Service<
  MainWindow,
  {
    readonly ensure: (
      onRendererLoaded: RendererLoaded,
    ) => Effect.Effect<Electron.BrowserWindow, MainWindowError>;
    readonly reload: Effect.Effect<void>;
  }
>()("@mosaic/desktop/main/MainWindow") {
  static readonly layer = Layer.effect(
    MainWindow,
    Effect.gen(function* () {
      let mainWindow: Electron.BrowserWindow | undefined;
      let rendererProtocolRegistered = false;
      let securityHeadersRegistered = false;
      const rendererRoot = NodePath.join(__dirname, "renderer");

      const developmentUrl = process.env.MOSAIC_RENDERER_DEV_URL?.trim();

      const applicationUrl = yield* Effect.try({
        try: () => {
          if (!developmentUrl) {
            return "mosaic://app/";
          }

          const url = URL.parse(developmentUrl);
          if (url === null || url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
            throw new Error("The development renderer must use 127.0.0.1 over HTTP.");
          }
          return url.href;
        },
        catch: (cause) =>
          new MainWindowError({
            message: "MOSAIC_RENDERER_DEV_URL is invalid.",
            cause,
          }),
      });

      const registerSecurityHeaders = () => {
        if (securityHeadersRegistered) {
          return;
        }
        securityHeadersRegistered = true;

        const connectSource = developmentUrl ? "'self' ws://127.0.0.1:5173" : "'self'";
        const scriptSource = developmentUrl ? "'self' 'unsafe-inline'" : "'self'";
        const policy = [
          "default-src 'self'",
          "base-uri 'none'",
          `connect-src ${connectSource}`,
          "font-src 'self'",
          "frame-src 'none'",
          "img-src 'self' data:",
          "object-src 'none'",
          `script-src ${scriptSource}`,
          "style-src 'self' 'unsafe-inline'",
        ].join("; ");

        Electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
          callback({
            responseHeaders: {
              ...details.responseHeaders,
              "Content-Security-Policy": [policy],
            },
          });
        });
      };

      const resolveRendererAsset = (requestUrl: string) => {
        const url = URL.parse(requestUrl);
        if (url === null || url.hostname !== "app") {
          return undefined;
        }

        const pathname = decodeURIComponent(url.pathname);
        const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
        const candidate = NodePath.resolve(rendererRoot, relativePath);
        const isInsideRenderer =
          candidate === rendererRoot || candidate.startsWith(`${rendererRoot}${NodePath.sep}`);

        if (!isInsideRenderer) {
          return undefined;
        }
        if (NodeFS.existsSync(candidate) && NodeFS.statSync(candidate).isFile()) {
          return candidate;
        }

        return NodePath.extname(candidate) === ""
          ? NodePath.join(rendererRoot, "index.html")
          : undefined;
      };

      const registerRendererProtocol = () => {
        if (rendererProtocolRegistered || developmentUrl) {
          return;
        }
        rendererProtocolRegistered = true;

        Electron.protocol.handle("mosaic", (request) => {
          const asset = resolveRendererAsset(request.url);
          return asset === undefined
            ? new Response("Not found", { status: 404 })
            : Electron.net.fetch(pathToFileURL(asset).href);
        });
      };

      const ensure = Effect.fn("MainWindow.ensure")(function* (onRendererLoaded: RendererLoaded) {
        if (mainWindow !== undefined && !mainWindow.isDestroyed()) {
          return mainWindow;
        }

        registerSecurityHeaders();
        registerRendererProtocol();

        const window = yield* Effect.try({
          try: () =>
            new Electron.BrowserWindow({
              width: 1120,
              height: 760,
              minWidth: 720,
              minHeight: 520,
              show: false,
              backgroundColor: "#fafafa",
              title: "Mosaic",
              webPreferences: {
                preload: NodePath.join(__dirname, "preload.cjs"),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                webSecurity: true,
              },
            }),
          catch: (cause) =>
            new MainWindowError({
              message: "Could not create the Mosaic window.",
              cause,
            }),
        });

        mainWindow = window;
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event, url) => {
          if (url !== applicationUrl) {
            event.preventDefault();
          }
        });
        window.webContents.on("did-finish-load", () => onRendererLoaded(window.webContents));
        window.once("ready-to-show", () => window.show());
        window.once("closed", () => {
          if (mainWindow === window) {
            mainWindow = undefined;
          }
        });

        const discardWindow = Effect.sync(() => {
          if (mainWindow === window) {
            mainWindow = undefined;
          }
          if (!window.isDestroyed()) {
            window.destroy();
          }
        });
        yield* Effect.tryPromise({
          try: () => window.loadURL(applicationUrl),
          catch: (cause) =>
            new MainWindowError({
              message: "Could not load the Mosaic renderer.",
              cause,
            }),
        }).pipe(Effect.tapError(() => discardWindow));

        return window;
      });

      const reload = Effect.sync(() => {
        const window = mainWindow;
        if (window !== undefined && !window.isDestroyed() && !window.webContents.isLoading()) {
          window.webContents.reload();
        }
      });

      return MainWindow.of({ ensure, reload });
    }),
  );
}
