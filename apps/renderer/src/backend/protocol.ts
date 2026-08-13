import { BackendRpcServerFrame } from "@mosaic/contracts/rpc-transport";
import { Effect, Schema } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcClientDefect, RpcClientError } from "effect/unstable/rpc/RpcClientError";
import type { FromServerEncoded } from "effect/unstable/rpc/RpcMessage";

const protocolError = (message: string, cause?: unknown) =>
  new RpcClientError({
    reason: new RpcClientDefect({ message, cause }),
  });

export const makeMessagePortClientProtocol = (port: MessagePort) =>
  RpcClient.Protocol.make(
    Effect.fnUntraced(function* (writeResponse) {
      const context = yield* Effect.context<never>();
      const runFork = Effect.runForkWith(context);
      let clientId: number | undefined;

      const failClient = (error: RpcClientError) => {
        if (clientId === undefined) {
          return;
        }

        runFork(
          writeResponse(clientId, {
            _tag: "ClientProtocolError",
            error,
          }),
        );
      };

      const onMessage = (event: MessageEvent<unknown>) => {
        if (clientId === undefined) {
          return;
        }

        runFork(
          Schema.decodeUnknownEffect(BackendRpcServerFrame)(event.data).pipe(
            Effect.flatMap((message) => writeResponse(clientId!, message as FromServerEncoded)),
            Effect.catch((error) =>
              writeResponse(clientId!, {
                _tag: "ClientProtocolError",
                error: protocolError("The utility process sent an invalid RPC frame.", error),
              }),
            ),
          ),
        );
      };

      const onClose = () => {
        failClient(protocolError("The utility process connection closed."));
      };

      port.addEventListener("message", onMessage);
      port.addEventListener("close", onClose);
      port.start();

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          port.removeEventListener("message", onMessage);
          port.removeEventListener("close", onClose);
          port.close();
        }),
      );

      return {
        send(nextClientId, request) {
          clientId = nextClientId;

          return Effect.try({
            try: () => port.postMessage(request),
            catch: (cause) =>
              protocolError("Could not send an RPC frame to the utility process.", cause),
          });
        },
        supportsAck: true,
        supportsTransferables: false,
      };
    }),
  );
