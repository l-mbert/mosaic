import { BackendRpcs } from "@mosaic/contracts/backend";
import * as Effect from "effect/Effect";
import type { ParentPort } from "electron";
import * as RpcServer from "effect/unstable/rpc/RpcServer";

import * as Handlers from "./Handlers.ts";
import { makeMessagePortServerProtocol } from "./MessagePortServerProtocol.ts";

export const start = Effect.fn("RpcServer.start")(function* (parentPort: ParentPort) {
  const protocol = yield* makeMessagePortServerProtocol(parentPort);

  yield* RpcServer.make(BackendRpcs, { concurrency: 8 }).pipe(
    Effect.provide(Handlers.layer),
    Effect.provideService(RpcServer.Protocol, protocol),
    Effect.forkScoped,
  );
});
