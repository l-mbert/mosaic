import {
  ClientHello,
  PROTOCOL_VERSION,
  UtilityHandshakeResponse,
} from "@mosaic/contracts/rpc/handshake";
import { Effect, Exit, Schema, Scope } from "effect";
import * as Match from "effect/Match";

const BACKEND_PORT_MESSAGE = "MosaicBackendPort";
export const BOOTSTRAP_TIMEOUT_MS = 10_000;

export interface BackendMessagePort {
  listenMessage(listener: (message: typeof Schema.Unknown.Type) => void): () => void;
  listenClose(listener: () => void): () => void;
  start(): void;
  postMessage(message: typeof Schema.Unknown.Type): void;
  close(): void;
}

export interface BackendPortSource {
  listen(
    listener: (
      message: typeof Schema.Unknown.Type,
      ports: ReadonlyArray<BackendMessagePort>,
    ) => void,
  ): () => void;
}

export class BackendPortTransferTimedOut extends Schema.TaggedError<BackendPortTransferTimedOut>()(
  "BackendPortTransferTimedOut",
  {},
) {}

export class BackendHandshakeTimedOut extends Schema.TaggedError<BackendHandshakeTimedOut>()(
  "BackendHandshakeTimedOut",
  {},
) {}

export class BackendPortOperationFailed extends Schema.TaggedError<BackendPortOperationFailed>()(
  "BackendPortOperationFailed",
  { cause: Schema.Defect() },
) {}

export class BackendProtocolMismatch extends Schema.TaggedError<BackendProtocolMismatch>()(
  "BackendProtocolMismatch",
  {
    rendererVersion: Schema.Int,
    utilityVersion: Schema.Int,
  },
) {}

const adaptMessagePort = (port: MessagePort): BackendMessagePort => ({
  listenMessage: (listener) => {
    const onMessage = (event: MessageEvent) => listener(event.data);
    port.addEventListener("message", onMessage);
    return () => port.removeEventListener("message", onMessage);
  },
  listenClose: (listener) => {
    port.addEventListener("close", listener);
    return () => port.removeEventListener("close", listener);
  },
  start: () => port.start(),
  postMessage: (message) => port.postMessage(message),
  close: () => port.close(),
});

export const browserBackendPortSource: BackendPortSource = {
  listen: (listener) => {
    const onMessage = (event: MessageEvent) => {
      listener(event.data, event.ports.map(adaptMessagePort));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  },
};

const receiveBackendPort = (source: BackendPortSource) =>
  Effect.callback<BackendMessagePort>((resume) => {
    let removeListener = () => {};
    removeListener = source.listen((message, ports) => {
      if (message !== BACKEND_PORT_MESSAGE || ports.length !== 1) {
        return;
      }
      removeListener();
      resume(Effect.succeed(ports[0]));
    });
    return Effect.sync(removeListener);
  });

const exchangeHandshake = (port: BackendMessagePort) =>
  Effect.callback<unknown, BackendPortOperationFailed>((resume) => {
    let removeListener = () => {};
    removeListener = port.listenMessage((message) => {
      removeListener();
      resume(Effect.succeed(message));
    });

    try {
      port.start();
      port.postMessage(ClientHello.make({ protocolVersion: PROTOCOL_VERSION }));
    } catch (cause) {
      removeListener();
      resume(Effect.fail(new BackendPortOperationFailed({ cause })));
    }

    return Effect.sync(removeListener);
  });

export const acquireBackendPort = Effect.fn("acquireBackendPort")(function* (
  source: BackendPortSource,
): Effect.fn.Return<
  BackendMessagePort,
  | BackendPortTransferTimedOut
  | BackendHandshakeTimedOut
  | BackendPortOperationFailed
  | BackendProtocolMismatch
  | Schema.SchemaError,
  Scope.Scope
> {
  const owned = yield* Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const port = yield* restore(
        receiveBackendPort(source).pipe(
          Effect.timeoutOrElse({
            duration: BOOTSTRAP_TIMEOUT_MS,
            orElse: () => new BackendPortTransferTimedOut(),
          }),
        ),
      );
      let closed = false;
      const close = Effect.sync(() => {
        if (!closed) {
          closed = true;
          port.close();
        }
      });
      yield* Effect.addFinalizer(() => close);
      return { port, close };
    }),
  );

  yield* Effect.gen(function* () {
    const response = yield* exchangeHandshake(owned.port).pipe(
      Effect.timeoutOrElse({
        duration: BOOTSTRAP_TIMEOUT_MS,
        orElse: () => new BackendHandshakeTimedOut(),
      }),
      Effect.flatMap(Schema.decodeUnknownEffect(UtilityHandshakeResponse)),
    );

    yield* Match.value(response).pipe(
      Match.tag("MosaicUtilityReady", () => Effect.void),
      Match.tag("MosaicIncompatibleProtocol", ({ expectedVersion, receivedVersion }) =>
        Effect.fail(
          new BackendProtocolMismatch({
            rendererVersion: receivedVersion,
            utilityVersion: expectedVersion,
          }),
        ),
      ),
      Match.exhaustive,
    );
  }).pipe(Effect.onExit((exit) => (Exit.isFailure(exit) ? owned.close : Effect.void)));

  return owned.port;
});

export const startEagerRuntime = <Value>(
  initialize: () => Promise<Value>,
  dispose: () => Promise<void>,
) => {
  const readiness = initialize();
  void readiness.catch(() => undefined);

  return {
    readiness,
    dispose: () => {
      void dispose().catch(() => undefined);
    },
  };
};
