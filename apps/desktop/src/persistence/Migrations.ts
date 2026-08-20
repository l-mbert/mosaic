import * as Effect from "effect/Effect";
import * as Migrator from "effect/unstable/sql/Migrator";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import initialMailSql from "./Migrations/001_InitialMail.sql?raw";

const makeSqlMigration = Effect.fn("Database.executeMigrationSql")(function* (source: string) {
  const sql = yield* SqlClient.SqlClient;
  const statements = source
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    yield* sql.unsafe(statement);
  }
});

const loadMigrations = Migrator.fromRecord({
  "1_InitialMail": makeSqlMigration(initialMailSql),
});
const run = Migrator.make({});

export const runMigrations = Effect.fn("Database.runMigrations")(function* () {
  const executed = yield* run({ loader: loadMigrations });
  const migrations = executed.map(([id, name]) => `${id}_${name}`);

  yield* migrations.length === 0
    ? Effect.logDebug("Database schema is current")
    : Effect.logInfo("Database migrations completed").pipe(Effect.annotateLogs({ migrations }));

  return executed;
});
