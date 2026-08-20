import { AttachRenderer } from "@mosaic/contracts/desktop";
import {
  ClientHello,
  IncompatibleProtocol,
  PROTOCOL_VERSION,
  UtilityReady,
} from "@mosaic/contracts/rpc/handshake";
import { BackendRpcClientFrame } from "@mosaic/contracts/rpc/transport";
import { Effect, Exit, FiberSet, Option, Queue, Result, Schema, Scope } from "effect";
import * as Match from "effect/Match";
import type { MessageEvent, MessagePortMain, ParentPort } from "electron";
import * as RpcServer from "effect/unstable/rpc/RpcServer";

import {
  admitFrame,
  FrameRejection,
  type FrameRejection as FrameRejectionType,
  makeOutstandingRequestTracker,
  type OutstandingRequestTracker,
} from "./MessagePortPolicies.ts";

class RendererPortClosed extends Schema.TaggedError<RendererPortClosed>()(
  "RendererPortClosed",
  {},
) {}

class RendererHandshakeTimedOut extends Schema.TaggedError<RendererHandshakeTimedOut>()(
  "RendererHandshakeTimedOut",
  {},
) {}

class RendererQueueCapacityExceeded extends Schema.TaggedClass<RendererQueueCapacityExceeded>()(
  "RendererQueueCapacityExceeded",
  { capacity: Schema.Int },
) {}

const ConnectionRejection = Schema.Union([FrameRejection, RendererQueueCapacityExceeded]);
type ConnectionRejection = typeof ConnectionRejection.Type;

const CLIENT_QUEUE_CAPACITY = 64;
const MAX_OUTSTANDING_REQUESTS = 32;
const RENDERER_HANDSHAKE_TIMEOUT_MS = 5_000;

interface RendererConnection {
  readonly scope: Scope.Closeable;
  readonly port: MessagePortMain;
  readonly requests: OutstandingRequestTracker;
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
): Effect.Effect<RpcServer.Protocol["Service"], never, Scope.Scope> =>
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

      const rejectConnection = Effect.fnUntraced(function* (
        clientId: number,
        reason: ConnectionRejection,
      ) {
        yield* Match.value(reason).pipe(
          Match.tag("InvalidFrame", () =>
            Effect.logWarning("Closing a renderer that sent an invalid RPC frame.").pipe(
              Effect.annotateLogs({ clientId, reason: reason._tag }),
            ),
          ),
          Match.tag("UnknownRpc", ({ rpcTag, _tag }) =>
            Effect.logWarning("Closing a renderer that requested an unknown RPC.").pipe(
              Effect.annotateLogs({ clientId, reason: _tag, rpcTag }),
            ),
          ),
          Match.tag("InvalidPayload", ({ rpcTag, _tag }) =>
            Effect.logWarning("Closing a renderer that sent an invalid RPC payload.").pipe(
              Effect.annotateLogs({ clientId, reason: _tag, rpcTag }),
            ),
          ),
          Match.tag("DuplicateRequestId", ({ _tag }) =>
            Effect.logWarning("Closing a renderer that reused an active RPC request ID.").pipe(
              Effect.annotateLogs({ clientId, reason: _tag }),
            ),
          ),
          Match.tag("OutstandingRequestLimitExceeded", ({ limit, _tag }) =>
            Effect.logWarning(
              "Closing a renderer that exceeded its outstanding RPC request limit.",
            ).pipe(Effect.annotateLogs({ clientId, reason: _tag, limit })),
          ),
          Match.tag("RendererQueueCapacityExceeded", ({ capacity, _tag }) =>
            Effect.logWarning("Closing a renderer that exceeded its RPC queue capacity.").pipe(
              Effect.annotateLogs({ clientId, reason: _tag, capacity }),
            ),
          ),
          Match.exhaustive,
        );
        yield* disconnect(clientId);
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

            const assignedClientId = nextClientId;
            nextClientId += 1;
            const connectionScope = yield* Scope.fork(connectionsScope);
            const connectionExit = yield* Effect.exit(
              Effect.gen(function* () {
                const inbox = yield* Queue.bounded<BackendRpcClientFrame>(CLIENT_QUEUE_CAPACITY);
                const requests = makeOutstandingRequestTracker(MAX_OUTSTANDING_REQUESTS);
                const connection: RendererConnection = {
                  scope: connectionScope,
                  port,
                  requests,
                };
                let rejecting = false;

                const reject = (reason: FrameRejectionType | RendererQueueCapacityExceeded) => {
                  if (rejecting) {
                    return;
                  }
                  rejecting = true;
                  runFork(rejectConnection(assignedClientId, reason));
                };
                const onMessage = (event: MessageEvent) => {
                  const admission = admitFrame(event.data, requests);
                  if (Result.isFailure(admission)) {
                    reject(admission.failure);
                    return;
                  }

                  const frame = admission.success;
                  if (!Queue.offerUnsafe(inbox, frame)) {
                    if (frame._tag === "Request") {
                      requests.rollback(frame.id);
                    }
                    reject(new RendererQueueCapacityExceeded({ capacity: CLIENT_QUEUE_CAPACITY }));
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
          runFork(Effect.logWarning("Ignoring an invalid renderer attachment."));
          return;
        }
        if (port === undefined) {
          runFork(Effect.logWarning("Renderer attachment did not include a message port."));
          return;
        }
        runFork(
          attach(port).pipe(
            Effect.catch(() => Effect.logWarning("Ignoring an invalid renderer attachment.")),
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
            if (connection === undefined) {
              return;
            }
            connection.requests.observeResponse(response);
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
