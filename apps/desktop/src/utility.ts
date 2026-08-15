import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { UtilityBackendReady, UtilityBooted } from "@mosaic/contracts/desktop";
import { PROTOCOL_VERSION } from "@mosaic/contracts/rpc/handshake";
import { Config, Effect, Layer } from "effect";

import { makeSqliteLayer } from "./persistence/Layers/Sqlite.ts";
import * as Persistence from "./persistence/RuntimeLayer.ts";
import * as RpcServer from "./rpc/Server.ts";

const parentPort = process.parentPort;

if (parentPort === undefined) {
  throw new Error("The Mosaic utility process requires an Electron parent port.");
}

const program = Effect.gen(function* () {
  parentPort.postMessage(UtilityBooted.make({ protocolVersion: PROTOCOL_VERSION }));

  const databaseFilename = yield* Config.nonEmptyString("MOSAIC_DATABASE_PATH");
  const UtilityLive = Persistence.layer.pipe(
    Layer.provide(makeSqliteLayer({ filename: databaseFilename })),
  );

  return yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.logInfo("Local mail database ready.").pipe(
        Effect.annotateLogs({ databaseFilename }),
      );

      yield* RpcServer.start(parentPort);

      parentPort.postMessage(UtilityBackendReady.make({ protocolVersion: PROTOCOL_VERSION }));

      return yield* Effect.never;
    }).pipe(Effect.provide(UtilityLive)),
  );
});

NodeRuntime.runMain(program);
