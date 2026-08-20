import { BackendRpcs } from "@mosaic/contracts/backend";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";

import { acquireBackendPort, browserBackendPortSource, startEagerRuntime } from "./port.ts";
import { makeMessagePortClientProtocol } from "./protocol.ts";

type BackendRpcClient = RpcClient.FromGroup<typeof BackendRpcs, RpcClientError>;

class BackendClient extends Context.Service<BackendClient, BackendRpcClient>()(
  "@mosaic/renderer/backend/BackendClient",
) {}

const BackendLive = Layer.effect(
  BackendClient,
  Effect.gen(function* () {
    const port = yield* acquireBackendPort(browserBackendPortSource);
    const protocol = yield* makeMessagePortClientProtocol(port);
    const client = yield* RpcClient.make(BackendRpcs).pipe(
      Effect.provideService(RpcClient.Protocol, protocol),
    );
    return BackendClient.of(client);
  }),
);

const backendRuntime = ManagedRuntime.make(BackendLive);
const backendLifecycle = startEagerRuntime(
  () => backendRuntime.context(),
  () => backendRuntime.dispose(),
);

window.addEventListener("beforeunload", backendLifecycle.dispose, { once: true });

export async function withBackendClient<A, E>(
  operation: (client: BackendRpcClient) => Effect.Effect<A, E>,
): Promise<A> {
  await backendLifecycle.readiness;
  return backendRuntime.runPromise(Effect.flatMap(BackendClient, operation));
}
