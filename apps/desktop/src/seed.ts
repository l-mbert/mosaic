import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import * as Electron from "electron";

import { getDatabaseFilename } from "./main/DatabasePath.ts";
import { makeSqliteLayer } from "./persistence/Layers/Sqlite.ts";
import { seedMailFixture } from "./persistence/Seed.ts";

const program = Effect.gen(function* () {
  if (process.env.MOSAIC_DESKTOP_DEV !== "1") {
    return yield* Effect.die("Fixture seeding is restricted to the development database.");
  }

  yield* Effect.promise(() => Electron.app.whenReady());
  const filename = getDatabaseFilename();
  const result = yield* seedMailFixture().pipe(Effect.provide(makeSqliteLayer({ filename })));

  if (result.status === "already-populated") {
    yield* Effect.logInfo("Development mail database is already populated.").pipe(
      Effect.annotateLogs({ filename, accountCount: result.accountCount }),
    );
  } else {
    yield* Effect.logInfo("Development mail database seeded.").pipe(
      Effect.annotateLogs({
        filename,
        accountCount: result.accountCount,
        threadCount: result.threadCount,
        messageCount: result.messageCount,
      }),
    );
  }
}).pipe(Effect.ensuring(Effect.sync(() => Electron.app.quit())));

NodeRuntime.runMain(program);
