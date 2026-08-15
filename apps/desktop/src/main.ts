import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Effect, FiberSet, Layer, Stream } from "effect";
import * as Electron from "electron";

import { MainWindow } from "./main/MainWindow.ts";
import * as UtilitySupervisor from "./main/UtilitySupervisor.ts";

Electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "mosaic",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      stream: true,
    },
  },
]);

const waitForAppReady = Effect.promise(() => Electron.app.whenReady());

const waitForQuit = Effect.callback<void>((resume) => {
  const onQuit = () => resume(Effect.void);
  Electron.app.once("will-quit", onQuit);
  return Effect.sync(() => Electron.app.off("will-quit", onQuit));
});

const MainLive = Layer.mergeAll(MainWindow.layer, UtilitySupervisor.layer);

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* waitForAppReady;

    const mainWindow = yield* MainWindow;
    const utilitySupervisor = yield* UtilitySupervisor.UtilitySupervisor;
    const runFork = yield* FiberSet.makeRuntime();
    yield* Stream.fromPubSub(utilitySupervisor.events).pipe(
      Stream.runForEach((event) => {
        if (event._tag === "Ready") {
          return mainWindow.reload;
        }
        if (event._tag === "Exhausted") {
          return Effect.logError("The local backend is unavailable.");
        }
        return Effect.void;
      }),
      Effect.forkScoped,
    );

    yield* utilitySupervisor.start;

    const connectRenderer = (webContents: Electron.WebContents) => {
      runFork(
        utilitySupervisor
          .connect(webContents)
          .pipe(Effect.catch((error) => Effect.logError(error.message))),
      );
    };
    const openWindow = () => {
      runFork(
        mainWindow
          .ensure(connectRenderer)
          .pipe(Effect.catch((error) => Effect.logError(error.message))),
      );
    };
    const onActivate = () => openWindow();
    const onAllWindowsClosed = () => {
      if (process.platform !== "darwin") {
        Electron.app.quit();
      }
    };

    Electron.app.on("activate", onActivate);
    Electron.app.on("window-all-closed", onAllWindowsClosed);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        Electron.app.off("activate", onActivate);
        Electron.app.off("window-all-closed", onAllWindowsClosed);
      }),
    );

    yield* mainWindow.ensure(connectRenderer);
    yield* waitForQuit;
  }),
).pipe(Effect.provide(MainLive));

NodeRuntime.runMain(program);
