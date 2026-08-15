import { BackendRpcs } from "@mosaic/contracts/backend";
import { AttachRenderer } from "@mosaic/contracts/desktop";
import {
  ClientHello,
  IncompatibleProtocol,
  PROTOCOL_VERSION,
  UtilityReady,
} from "@mosaic/contracts/rpc/handshake";
import { BackendRpcClientFrame } from "@mosaic/contracts/rpc/transport";
import { Effect, Exit, FiberSet, Option, Queue, Result, Schema, Scope } from "effect";
import type { MessageEvent, MessagePortMain, ParentPort } from "electron";
import * as RpcServer from "effect/unstable/rpc/RpcServer";

class RendererPortClosed extends Schema.TaggedError<RendererPortClosed>()(
  "RendererPortClosed",
  {},
) {}

class RendererHandshakeTimedOut extends Schema.TaggedError<RendererHandshakeTimedOut>()(
  "RendererHandshakeTimedOut",
  {},
) {}

const CLIENT_QUEUE_CAPACITY = 64;
const MAX_OUTSTANDING_REQUESTS = 32;
const RENDERER_HANDSHAKE_TIMEOUT_MS = 5_000;

interface RendererConnection {
  readonly scope: Scope.Closeable;
  readonly port: MessagePortMain;
  readonly requestIds: Set<string | number>;
}

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
      const protocolScope = yield* Scope.Scope;
      const callbackScope = yield* Scope.fork(protocolScope);
      const connectionsScope = yield* Scope.fork(protocolScope);
      const runFork = yield* FiberSet.makeRuntime().pipe(Scope.provide(callbackScope));
      const disconnects = yield* Queue.unbounded<number>();
      const connections = new Map<number, RendererConnection>();
      let nextClientId = 0;

      const disconnect = Effect.fnUntraced(function* (clientId: number) {
        const connection = connections.get(clientId);
        if (connection === undefined) {
          return;
        }
        yield* Scope.close(connection.scope, Exit.void);
      });

      const attach = Effect.fn("MessagePortServerProtocol.attach")(function* (
        port: MessagePortMain,
      ) {
        return yield* Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* () {
            const handshakeExit = yield* Effect.exit(
              restore(
                receiveFirstMessage(port).pipe(
                  Effect.flatMap(Schema.decodeUnknownEffect(ClientHello)),
                  Effect.timeoutOrElse({
                    duration: RENDERER_HANDSHAKE_TIMEOUT_MS,
                    orElse: () => new RendererHandshakeTimedOut(),
                  }),
                ),
              ),
            );

            if (Exit.isFailure(handshakeExit)) {
              yield* Effect.sync(() => port.close());
              return yield* handshakeExit;
            }
            const hello = handshakeExit.value;

            if (hello.protocolVersion !== PROTOCOL_VERSION) {
              yield* Effect.sync(() => {
                try {
                  port.postMessage(
                    IncompatibleProtocol.make({
                      expectedVersion: PROTOCOL_VERSION,
                      receivedVersion: hello.protocolVersion,
                    }),
                  );
                } finally {
                  port.close();
                }
              });
              return;
            }

            const assignedClientId = nextClientId++;
            const connectionScope = yield* Scope.fork(connectionsScope);
            const connectionExit = yield* Effect.exit(
              Effect.gen(function* () {
                const inbox = yield* Queue.bounded<BackendRpcClientFrame>(CLIENT_QUEUE_CAPACITY);
                const requestIds = new Set<string | number>();
                const connection: RendererConnection = {
                  scope: connectionScope,
                  port,
                  requestIds,
                };

                const onMessage = (event: MessageEvent) => {
                  const decoded = Schema.decodeUnknownResult(BackendRpcClientFrame)(event.data);
                  if (Result.isFailure(decoded)) {
                    runFork(
                      Effect.logWarning("Closing a renderer that sent an invalid RPC frame.").pipe(
                        Effect.annotateLogs({
                          clientId: assignedClientId,
                          error: decoded.failure.message,
                        }),
                        Effect.andThen(disconnect(assignedClientId)),
                      ),
                    );
                    return;
                  }

                  let message = decoded.success;
                  if (message._tag === "Request") {
                    const rpc = BackendRpcs.requests.get(message.tag);
                    if (rpc === undefined) {
                      runFork(
                        Effect.logWarning("Closing a renderer that requested an unknown RPC.").pipe(
                          Effect.annotateLogs({
                            clientId: assignedClientId,
                            tag: message.tag,
                          }),
                          Effect.andThen(disconnect(assignedClientId)),
                        ),
                      );
                      return;
                    }
                    const payloadCodec = Schema.toCodecJson(rpc.payloadSchema);
                    const payload = Result.flatMap(
                      Schema.decodeUnknownResult(payloadCodec)(message.payload),
                      Schema.encodeUnknownResult(payloadCodec),
                    );
                    if (Result.isFailure(payload)) {
                      runFork(
                        Effect.logWarning(
                          "Closing a renderer that sent an invalid RPC payload.",
                        ).pipe(
                          Effect.annotateLogs({
                            clientId: assignedClientId,
                            tag: message.tag,
                            error: payload.failure.message,
                          }),
                          Effect.andThen(disconnect(assignedClientId)),
                        ),
                      );
                      return;
                    }
                    message = { ...message, payload: payload.success };

                    if (requestIds.size >= MAX_OUTSTANDING_REQUESTS || requestIds.has(message.id)) {
                      runFork(
                        Effect.logWarning(
                          "Closing a renderer that exceeded its outstanding RPC request limit.",
                        ).pipe(
                          Effect.annotateLogs({
                            clientId: assignedClientId,
                            limit: MAX_OUTSTANDING_REQUESTS,
                          }),
                          Effect.andThen(disconnect(assignedClientId)),
                        ),
                      );
                      return;
                    }
                    requestIds.add(message.id);
                  }

                  if (!Queue.offerUnsafe(inbox, message)) {
                    if (message._tag === "Request") {
                      requestIds.delete(message.id);
                    }
                    runFork(
                      Effect.logWarning(
                        "Closing a renderer that exceeded its RPC queue capacity.",
                      ).pipe(
                        Effect.annotateLogs({
                          clientId: assignedClientId,
                          capacity: CLIENT_QUEUE_CAPACITY,
                        }),
                        Effect.andThen(disconnect(assignedClientId)),
                      ),
                    );
                  }
                };
                const onClose = () => runFork(disconnect(assignedClientId));

                yield* Queue.take(inbox).pipe(
                  Effect.flatMap((message) => writeRequest(assignedClientId, message)),
                  Effect.forever,
                  Effect.forkScoped,
                );

                yield* Effect.addFinalizer(() =>
                  Effect.gen(function* () {
                    const wasConnected = yield* Effect.sync(() => {
                      const isCurrent = connections.get(assignedClientId) === connection;
                      if (isCurrent) {
                        connections.delete(assignedClientId);
                      }
                      port.off("message", onMessage);
                      port.off("close", onClose);
                      return isCurrent;
                    });
                    yield* Queue.shutdown(inbox);
                    yield* Effect.sync(() => {
                      port.close();
                      if (wasConnected) {
                        Queue.offerUnsafe(disconnects, assignedClientId);
                      }
                    });
                  }),
                );

                yield* Effect.sync(() => {
                  connections.set(assignedClientId, connection);
                  port.on("message", onMessage);
                  port.once("close", onClose);
                  port.postMessage(UtilityReady.make({ protocolVersion: PROTOCOL_VERSION }));
                });
              }).pipe(Scope.provide(connectionScope)),
            );

            if (Exit.isFailure(connectionExit)) {
              yield* Scope.close(connectionScope, connectionExit);
            }
            return yield* connectionExit;
          }),
        );
      });

      const onParentMessage = (event: MessageEvent) => {
        const [port] = event.ports;
        const attachment = Schema.decodeUnknownResult(AttachRenderer)(event.data);
        if (Result.isFailure(attachment)) {
          port?.close();
          runFork(
            Effect.logWarning("Ignoring an invalid renderer attachment.").pipe(
              Effect.annotateLogs({ error: attachment.failure.message }),
            ),
          );
          return;
        }
        if (port === undefined) {
          runFork(Effect.logWarning("Renderer attachment did not include a message port."));
          return;
        }
        runFork(
          attach(port).pipe(
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
        Effect.gen(function* () {
          yield* Effect.sync(() => parentPort.off("message", onParentMessage));
          yield* Scope.close(callbackScope, Exit.void);
          yield* Scope.close(connectionsScope, Exit.void);
        }),
      );

      return {
        disconnects,
        send(clientId, response) {
          return Effect.sync(() => {
            const connection = connections.get(clientId);
            if (connection === undefined) return;
            if (response._tag === "Exit") {
              connection.requestIds.delete(response.requestId);
            }
            connection.port.postMessage(response);
          });
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
