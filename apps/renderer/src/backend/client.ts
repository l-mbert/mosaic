import { BackendRpcs } from "@mosaic/contracts/backend";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";

import { connectBackendPort } from "./port.ts";
import { makeMessagePortClientProtocol } from "./protocol.ts";

type BackendRpcClient = RpcClient.FromGroup<typeof BackendRpcs, RpcClientError>;

class BackendClient extends Context.Service<BackendClient, BackendRpcClient>()(
  "@mosaic/renderer/backend/BackendClient",
) {}

const makeBackendRuntime = async () => {
  const port = await connectBackendPort();
  const clientLayer = Layer.effect(BackendClient, RpcClient.make(BackendRpcs)).pipe(
    Layer.provide(Layer.effect(RpcClient.Protocol, makeMessagePortClientProtocol(port))),
  );

  return ManagedRuntime.make(clientLayer);
};

const backendRuntime = makeBackendRuntime();

window.addEventListener(
  "beforeunload",
  () => {
    void backendRuntime.then((runtime) => runtime.dispose());
  },
  { once: true },
);

export async function withBackendClient<A, E>(
  operation: (client: BackendRpcClient) => Effect.Effect<A, E>,
): Promise<A> {
  const runtime = await backendRuntime;
  return runtime.runPromise(Effect.flatMap(BackendClient, operation));
}
