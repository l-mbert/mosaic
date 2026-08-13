import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { UtilityStarted } from "@mosaic/contracts/desktop";
import { BackendRpcs, HealthResult } from "@mosaic/contracts/backend";
import { PROTOCOL_VERSION } from "@mosaic/contracts/handshake";
import { Effect } from "effect";
import * as RpcServer from "effect/unstable/rpc/RpcServer";

import { makeMessagePortServerProtocol } from "./utility/MessagePortServerProtocol.ts";

const parentPort = process.parentPort;

if (parentPort === undefined) {
  throw new Error("The Mosaic utility process requires an Electron parent port.");
}

const BackendHandlersLive = BackendRpcs.toLayer({
  Health: () =>
    Effect.succeed(
      HealthResult.make({
        status: "healthy",
        protocolVersion: PROTOCOL_VERSION,
      }),
    ),
});

const program = Effect.scoped(
  Effect.gen(function* () {
    const protocol = yield* makeMessagePortServerProtocol(parentPort);

    yield* RpcServer.make(BackendRpcs).pipe(
      Effect.provide(BackendHandlersLive),
      Effect.provideService(RpcServer.Protocol, protocol),
      Effect.forkScoped,
    );

    parentPort.postMessage(UtilityStarted.make({ protocolVersion: PROTOCOL_VERSION }));

    return yield* Effect.never;
  }),
);

NodeRuntime.runMain(program);
