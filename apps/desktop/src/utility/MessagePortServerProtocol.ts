import { AttachRenderer } from "@mosaic/contracts/desktop";
import {
  ClientHello,
  IncompatibleProtocol,
  PROTOCOL_VERSION,
  UtilityReady,
} from "@mosaic/contracts/handshake";
import { BackendRpcClientFrame } from "@mosaic/contracts/rpc-transport";
import { Effect, Option, Queue, Schema } from "effect";
import type { MessageEvent, MessagePortMain, ParentPort } from "electron";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import type { FromClientEncoded } from "effect/unstable/rpc/RpcMessage";

class RendererPortClosed extends Schema.TaggedError<RendererPortClosed>()(
  "RendererPortClosed",
  {},
) {}

const receiveFirstMessage = (port: MessagePortMain) =>
  Effect.callback<unknown, RendererPortClosed>((resume) => {
    const onMessage = (event: MessageEvent) => {
      cleanup();
      resume(Effect.succeed(event.data));
    };
    const onClose = () => {
      cleanup();
      resume(Effect.fail(new RendererPortClosed()));
    };
    const cleanup = () => {
      port.off("message", onMessage);
      port.off("close", onClose);
    };

    port.once("message", onMessage);
    port.once("close", onClose);
    port.start();

    return Effect.sync(cleanup);
  });

export const makeMessagePortServerProtocol = (
  parentPort: ParentPort,
): Effect.Effect<RpcServer.Protocol["Service"], never, import("effect").Scope.Scope> =>
  RpcServer.Protocol.make(
    Effect.fnUntraced(function* (writeRequest) {
      const context = yield* Effect.context<never>();
      const runFork = Effect.runForkWith(context);
      const disconnects = yield* Queue.unbounded<number>();
      const connections = new Map<number, MessagePortMain>();
      let nextClientId = 0;

      const disconnect = (clientId: number) =>
        Effect.sync(() => {
          const port = connections.get(clientId);
          if (port === undefined) {
            return;
          }
          connections.delete(clientId);
          port.close();
          Queue.offerUnsafe(disconnects, clientId);
        });

      const attach = Effect.fn("MessagePortServerProtocol.attach")(function* (
        port: MessagePortMain,
      ) {
        const hello = yield* receiveFirstMessage(port).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(ClientHello)),
        );

        if (hello.protocolVersion !== PROTOCOL_VERSION) {
          port.postMessage(
            IncompatibleProtocol.make({
              expectedVersion: PROTOCOL_VERSION,
              receivedVersion: hello.protocolVersion,
            }),
          );
          port.close();
          return;
        }

        port.postMessage(UtilityReady.make({ protocolVersion: PROTOCOL_VERSION }));
        const clientId = nextClientId++;
        connections.set(clientId, port);

        const onMessage = (event: MessageEvent) => {
          runFork(
            Schema.decodeUnknownEffect(BackendRpcClientFrame)(event.data).pipe(
              Effect.flatMap((message) => writeRequest(clientId, message as FromClientEncoded)),
              Effect.catch((error) =>
                Effect.logWarning("Closing a renderer that sent an invalid RPC frame.").pipe(
                  Effect.annotateLogs({ clientId, error: String(error) }),
                  Effect.andThen(disconnect(clientId)),
                ),
              ),
            ),
          );
        };
        const onClose = () => runFork(disconnect(clientId));

        port.on("message", onMessage);
        port.once("close", onClose);
      });

      const onParentMessage = (event: MessageEvent) => {
        runFork(
          Schema.decodeUnknownEffect(AttachRenderer)(event.data).pipe(
            Effect.flatMap(() => {
              const [port] = event.ports;
              return port === undefined
                ? Effect.logWarning("Renderer attachment did not include a message port.")
                : attach(port).pipe(Effect.tapError(() => Effect.sync(() => port.close())));
            }),
            Effect.catch((error) =>
              Effect.logWarning("Ignoring an invalid renderer attachment.").pipe(
                Effect.annotateLogs({ error: String(error) }),
              ),
            ),
          ),
        );
      };

      parentPort.on("message", onParentMessage);
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          parentPort.off("message", onParentMessage);
          for (const port of connections.values()) {
            port.close();
          }
          connections.clear();
        }),
      );

      return {
        disconnects,
        send(clientId, response) {
          return Effect.sync(() => connections.get(clientId)?.postMessage(response));
        },
        end: disconnect,
        clientIds: Effect.sync(() => new Set(connections.keys())),
        initialMessage: Effect.succeed(Option.none()),
        supportsAck: true,
        supportsTransferables: false,
        supportsSpanPropagation: true,
      };
    }),
  );
