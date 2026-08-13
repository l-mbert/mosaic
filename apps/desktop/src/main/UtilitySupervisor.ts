import * as NodePath from "node:path";

import { AttachRenderer, UtilityStarted } from "@mosaic/contracts/desktop";
import { PROTOCOL_VERSION } from "@mosaic/contracts/handshake";
import {
  Context,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Option,
  PubSub,
  Ref,
  Result,
  Schema,
  Scope,
} from "effect";
import * as Electron from "electron";

import { BACKEND_PORT_CHANNEL } from "../shared/Channels.ts";
import { UTILITY_HEALTHY_RESET_MS, utilityRestartDecision } from "./UtilityRestartPolicy.ts";

export type UtilitySupervisorEvent =
  | { readonly _tag: "Ready"; readonly restarted: boolean }
  | { readonly _tag: "Exhausted" };

export class UtilitySupervisorError extends Schema.TaggedError<UtilitySupervisorError>()(
  "UtilitySupervisorError",
  {
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export class UtilitySupervisor extends Context.Service<
  UtilitySupervisor,
  {
    readonly events: PubSub.PubSub<UtilitySupervisorEvent>;
    readonly start: Effect.Effect<void, UtilitySupervisorError>;
    readonly connect: (
      webContents: Electron.WebContents,
    ) => Effect.Effect<void, UtilitySupervisorError>;
  }
>()("@mosaic/desktop/main/UtilitySupervisor") {}

export const make = Effect.fn("UtilitySupervisor.make")(function* () {
  const parentScope = yield* Scope.Scope;
  const context = yield* Effect.context<never>();
  const runFork = Effect.runForkWith(context);
  const activeChild = yield* Ref.make<Option.Option<Electron.UtilityProcess>>(Option.none());
  const restartAttempt = yield* Ref.make(0);
  const everReady = yield* Ref.make(false);
  const stopping = yield* Ref.make(false);
  const initialReady = yield* Deferred.make<void, UtilitySupervisorError>();
  const events = yield* PubSub.unbounded<UtilitySupervisorEvent>();
  let loopFiber: Fiber.Fiber<void, never> | undefined;

  const utilityEntry = NodePath.join(__dirname, "utility.cjs");

  const clearActiveChild = (child: Electron.UtilityProcess) =>
    Ref.update(activeChild, (current) =>
      Option.exists(current, (active) => active === child) ? Option.none() : current,
    );

  const runAttempt = Effect.fn("UtilitySupervisor.runAttempt")(function* () {
    return yield* Effect.scoped(
      Effect.acquireUseRelease(
        Effect.try({
          try: () =>
            Electron.utilityProcess.fork(utilityEntry, [], {
              serviceName: "Mosaic Local Backend",
              stdio: "inherit",
            }),
          catch: (cause) =>
            new UtilitySupervisorError({
              message: "Could not launch the Mosaic utility process.",
              cause,
            }),
        }),
        (child) =>
          Effect.gen(function* () {
            const ready = yield* Deferred.make<void, UtilitySupervisorError>();
            const exited = yield* Deferred.make<number>();

            const onMessage = (message: unknown) => {
              runFork(
                Schema.decodeUnknownEffect(UtilityStarted)(message).pipe(
                  Effect.flatMap(() => Deferred.succeed(ready, undefined)),
                  Effect.catch((error) =>
                    Effect.logWarning("Ignoring an invalid utility control message.").pipe(
                      Effect.annotateLogs({ error: String(error) }),
                    ),
                  ),
                ),
              );
            };
            const onExit = (code: number) => {
              runFork(
                Effect.all([
                  Deferred.fail(
                    ready,
                    new UtilitySupervisorError({
                      message: `The Mosaic utility process exited before it became ready (code ${code}).`,
                    }),
                  ),
                  Deferred.succeed(exited, code),
                ]).pipe(Effect.asVoid),
              );
            };

            child.on("message", onMessage);
            child.once("exit", onExit);

            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                child.off("message", onMessage);
                child.off("exit", onExit);
              }),
            );

            yield* Deferred.await(ready);
            yield* Ref.set(activeChild, Option.some(child));
            const restarted = yield* Ref.getAndSet(everReady, true);

            if (!restarted) {
              yield* Deferred.succeed(initialReady, undefined);
            }

            yield* PubSub.publish(events, { _tag: "Ready", restarted });
            yield* Effect.logInfo("Mosaic utility process is ready.").pipe(
              Effect.annotateLogs({ pid: child.pid, restarted }),
            );

            yield* Effect.sleep(UTILITY_HEALTHY_RESET_MS).pipe(
              Effect.andThen(Ref.set(restartAttempt, 0)),
              Effect.forkScoped,
            );

            return yield* Deferred.await(exited);
          }),
        (child) =>
          Effect.andThen(
            clearActiveChild(child),
            Effect.sync(() => {
              if (child.pid !== undefined) {
                child.kill();
              }
            }),
          ),
      ),
    );
  });

  const runLoop = (): Effect.Effect<void> =>
    Effect.suspend(() =>
      Effect.gen(function* () {
        const result = yield* Effect.result(runAttempt());

        if (yield* Ref.get(stopping)) {
          return;
        }

        if (Result.isSuccess(result)) {
          yield* Effect.logWarning("Mosaic utility process exited unexpectedly.").pipe(
            Effect.annotateLogs({ exitCode: result.success }),
          );
        } else {
          yield* Effect.logWarning(result.failure.message);
        }

        const attempt = yield* Ref.get(restartAttempt);
        const decision = utilityRestartDecision(attempt);

        if (decision._tag === "Exhausted") {
          const error = new UtilitySupervisorError({
            message: "The Mosaic utility process exhausted its restart budget.",
          });
          yield* Deferred.fail(initialReady, error);
          yield* PubSub.publish(events, { _tag: "Exhausted" });
          yield* Effect.logError(error.message);
          return;
        }

        yield* Ref.set(restartAttempt, decision.nextAttempt);
        yield* Effect.logInfo("Restarting the Mosaic utility process.").pipe(
          Effect.annotateLogs({
            attempt: decision.nextAttempt,
            delayMs: decision.delayMs,
          }),
        );
        yield* Effect.sleep(decision.delayMs);
        return yield* runLoop();
      }),
    );

  const start = Effect.fn("UtilitySupervisor.start")(function* () {
    if (loopFiber === undefined) {
      loopFiber = yield* Effect.forkIn(runLoop(), parentScope);
    }

    return yield* Deferred.await(initialReady);
  });

  const connect = Effect.fn("UtilitySupervisor.connect")(function* (
    webContents: Electron.WebContents,
  ) {
    const childOption = yield* Ref.get(activeChild);
    if (Option.isNone(childOption)) {
      return yield* Effect.fail(
        new UtilitySupervisorError({
          message: "The Mosaic utility process is unavailable.",
        }),
      );
    }
    const child = childOption.value;
    const { port1, port2 } = new Electron.MessageChannelMain();

    yield* Effect.try({
      try: () => {
        child.postMessage(AttachRenderer.make({ protocolVersion: PROTOCOL_VERSION }), [port1]);
        webContents.postMessage(BACKEND_PORT_CHANNEL, null, [port2]);
      },
      catch: (cause) =>
        new UtilitySupervisorError({
          message: "Could not attach the renderer to the utility process.",
          cause,
        }),
    });
  });

  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      yield* Ref.set(stopping, true);
      if (loopFiber !== undefined) {
        yield* Fiber.interrupt(loopFiber);
      }
      yield* PubSub.shutdown(events);
    }),
  );

  return UtilitySupervisor.of({ events, start: start(), connect });
});

export const layer = Layer.effect(UtilitySupervisor, make());
