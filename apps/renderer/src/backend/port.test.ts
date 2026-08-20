import { assert, describe, it } from "@effect/vitest";
import { IncompatibleProtocol, UtilityReady } from "@mosaic/contracts/rpc/handshake";
import { Deferred, Effect, Exit, Fiber, Result, Schema, Scope } from "effect";
import { TestClock } from "effect/testing";

import {
  acquireBackendPort,
  type BackendMessagePort,
  type BackendPortSource,
  BOOTSTRAP_TIMEOUT_MS,
  startEagerRuntime,
} from "./port.ts";
import { makeMessagePortClientProtocol } from "./protocol.ts";

type PortMessage = typeof Schema.Unknown.Type;
type PortListener = (message: PortMessage) => void;
type SourceListener = (message: PortMessage, ports: ReadonlyArray<BackendMessagePort>) => void;

class FakePort implements BackendMessagePort {
  readonly messageListeners = new Set<PortListener>();
  readonly closeListeners = new Set<() => void>();
  readonly posted: Array<PortMessage> = [];
  closeCount = 0;
  startCount = 0;

  constructor(private readonly messageListenerAdded: Deferred.Deferred<void>) {}

  listenMessage(listener: PortListener): () => void {
    this.messageListeners.add(listener);
    Deferred.doneUnsafe(this.messageListenerAdded, Effect.void);
    return () => this.messageListeners.delete(listener);
  }

  listenClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  start(): void {
    this.startCount += 1;
  }

  postMessage(message: PortMessage): void {
    this.posted.push(message);
  }

  close(): void {
    this.closeCount += 1;
  }

  emitMessage(message: PortMessage): void {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }
}

class FakePortSource implements BackendPortSource {
  readonly listeners = new Set<SourceListener>();

  constructor(private readonly listenerAdded: Deferred.Deferred<void>) {}

  listen(listener: SourceListener): () => void {
    this.listeners.add(listener);
    Deferred.doneUnsafe(this.listenerAdded, Effect.void);
    return () => this.listeners.delete(listener);
  }

  emit(port: BackendMessagePort): void {
    for (const listener of this.listeners) {
      listener("MosaicBackendPort", [port]);
    }
  }
}

const makeFakes = Effect.fn("makeFakes")(function* () {
  const sourceListening = yield* Deferred.make<void>();
  const portListening = yield* Deferred.make<void>();
  return {
    sourceListening,
    portListening,
    source: new FakePortSource(sourceListening),
    port: new FakePort(portListening),
  };
});

describe("renderer backend port lifecycle", () => {
  it.effect("removes the transfer listener when acquisition times out", () =>
    Effect.gen(function* () {
      const { source, sourceListening } = yield* makeFakes();
      const fiber = yield* acquireBackendPort(source).pipe(Effect.scoped, Effect.forkChild);

      yield* Deferred.await(sourceListening);
      yield* TestClock.adjust(BOOTSTRAP_TIMEOUT_MS);
      const result = yield* Effect.result(Fiber.join(fiber));

      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "BackendPortTransferTimedOut");
      }
      assert.strictEqual(source.listeners.size, 0);
    }),
  );

  it.effect("closes the transferred port when the handshake times out", () =>
    Effect.gen(function* () {
      const { port, portListening, source, sourceListening } = yield* makeFakes();
      const fiber = yield* acquireBackendPort(source).pipe(Effect.scoped, Effect.forkChild);

      yield* Deferred.await(sourceListening);
      source.emit(port);
      yield* Deferred.await(portListening);
      yield* TestClock.adjust(BOOTSTRAP_TIMEOUT_MS);
      const result = yield* Effect.result(Fiber.join(fiber));

      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "BackendHandshakeTimedOut");
      }
      assert.strictEqual(source.listeners.size, 0);
      assert.strictEqual(port.messageListeners.size, 0);
      assert.strictEqual(port.closeCount, 1);
    }),
  );

  it.effect("closes the port after an invalid handshake", () =>
    Effect.gen(function* () {
      const { port, portListening, source, sourceListening } = yield* makeFakes();
      const fiber = yield* acquireBackendPort(source).pipe(Effect.scoped, Effect.forkChild);

      yield* Deferred.await(sourceListening);
      source.emit(port);
      yield* Deferred.await(portListening);
      port.emitMessage({ _tag: "InvalidHandshake" });
      const result = yield* Effect.result(Fiber.join(fiber));

      assert.isTrue(Result.isFailure(result));
      assert.strictEqual(port.messageListeners.size, 0);
      assert.strictEqual(port.closeCount, 1);
    }),
  );

  it.effect("closes the port after an incompatible handshake", () =>
    Effect.gen(function* () {
      const { port, portListening, source, sourceListening } = yield* makeFakes();
      const fiber = yield* acquireBackendPort(source).pipe(Effect.scoped, Effect.forkChild);

      yield* Deferred.await(sourceListening);
      source.emit(port);
      yield* Deferred.await(portListening);
      port.emitMessage(
        IncompatibleProtocol.make({
          expectedVersion: 1,
          receivedVersion: 2,
        }),
      );
      const result = yield* Effect.result(Fiber.join(fiber));

      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "BackendProtocolMismatch");
      }
      assert.strictEqual(port.messageListeners.size, 0);
      assert.strictEqual(port.closeCount, 1);
    }),
  );

  it.effect("transfers successful ownership to the outer protocol scope", () =>
    Effect.gen(function* () {
      const { port, portListening, source, sourceListening } = yield* makeFakes();
      const scope = yield* Scope.make();
      const fiber = yield* acquireBackendPort(source).pipe(Scope.provide(scope), Effect.forkChild);

      yield* Deferred.await(sourceListening);
      source.emit(port);
      yield* Deferred.await(portListening);
      port.emitMessage(UtilityReady.make({ protocolVersion: 1 }));
      const acquired = yield* Fiber.join(fiber);
      yield* makeMessagePortClientProtocol(acquired).pipe(Scope.provide(scope));

      assert.strictEqual(port.closeCount, 0);
      assert.strictEqual(port.messageListeners.size, 1);
      assert.strictEqual(port.closeListeners.size, 1);

      yield* Scope.close(scope, Exit.void);

      assert.strictEqual(port.messageListeners.size, 0);
      assert.strictEqual(port.closeListeners.size, 0);
      assert.strictEqual(port.closeCount, 1);
    }),
  );

  it("observes failed eager initialization and failed disposal", async () => {
    const lifecycle = startEagerRuntime(
      () => Promise.reject(new Error("startup failed")),
      () => Promise.reject(new Error("dispose failed")),
    );

    const failed = await lifecycle.readiness.then(
      () => false,
      () => true,
    );
    assert.isTrue(failed);

    lifecycle.dispose();
    await Promise.resolve();
  });
});
