import { BackendRpcServerFrame } from "@mosaic/contracts/rpc/transport";
import { Effect, Schema } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcClientDefect, RpcClientError } from "effect/unstable/rpc/RpcClientError";

import type { BackendMessagePort } from "./port.ts";

const protocolError = (message: string, cause?: unknown) =>
  new RpcClientError({
    reason: new RpcClientDefect({ message, cause }),
  });

export const makeMessagePortClientProtocol = (port: BackendMessagePort) =>
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

      const onMessage = (message: typeof Schema.Unknown.Type) => {
        const currentClientId = clientId;
        if (currentClientId === undefined) {
          return;
        }

        runFork(
          Schema.decodeUnknownEffect(BackendRpcServerFrame)(message).pipe(
            Effect.flatMap((frame) => writeResponse(currentClientId, frame)),
            Effect.catch((error) =>
              writeResponse(currentClientId, {
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

      const removeMessageListener = port.listenMessage(onMessage);
      const removeCloseListener = port.listenClose(onClose);
      port.start();

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          removeMessageListener();
          removeCloseListener();
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
