import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Migrator from "effect/unstable/sql/Migrator";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import initialMailSql from "./Migrations/001_InitialMail.sql?raw";
import threadSummariesSql from "./Migrations/002_ThreadSummaries.sql?raw";
import accountConsistencySql from "./Migrations/003_AccountConsistency.sql?raw";
import storedMailIntegritySql from "./Migrations/004_StoredMailIntegrity.sql?raw";
import messageSearchSql from "./Migrations/005_MessageSearch.sql?raw";
import canonicalSearchBodySql from "./Migrations/006_CanonicalSearchBody.sql?raw";
import strictStoredMailTypesSql from "./Migrations/007_StrictStoredMailTypes.sql?raw";
import storedMailBoundsSql from "./Migrations/008_StoredMailBounds.sql?raw";
import { toSearchableText } from "./SearchText.ts";

const makeSqlMigration = (source: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const statements = source
      .split("-- statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      yield* sql.unsafe(statement);
    }
  });

const SearchBodyRow = Schema.Struct({
  id: Schema.NonEmptyString,
  textBody: Schema.NullOr(Schema.String),
  htmlBody: Schema.NullOr(Schema.String),
});

const SEARCH_BODY_BATCH_SIZE = 500;

const canonicalSearchBodyMigration = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const findSearchBodyRows = SqlSchema.findAll({
    Request: Schema.String,
    Result: SearchBodyRow,
    execute: (afterId) => sql`
      SELECT id, text_body AS "textBody", html_body AS "htmlBody"
      FROM messages
      WHERE id > ${afterId}
      ORDER BY id
      LIMIT ${SEARCH_BODY_BATCH_SIZE}
    `,
  });
  let afterId = "";

  while (true) {
    const rows = yield* findSearchBodyRows(afterId);

    if (rows.length === 0) break;

    for (const row of rows) {
      yield* sql`
        UPDATE messages
        SET search_body = ${toSearchableText({ text: row.textBody, html: row.htmlBody })}
        WHERE id = ${row.id}
      `;
    }

    afterId = rows[rows.length - 1].id;
  }

  yield* makeSqlMigration(canonicalSearchBodySql);
});

const migrationEntries = [
  [1, "InitialMail", makeSqlMigration(initialMailSql)],
  [2, "ThreadSummaries", makeSqlMigration(threadSummariesSql)],
  [3, "AccountConsistency", makeSqlMigration(accountConsistencySql)],
  [4, "StoredMailIntegrity", makeSqlMigration(storedMailIntegritySql)],
  [5, "MessageSearch", makeSqlMigration(messageSearchSql)],
  [6, "CanonicalSearchBody", canonicalSearchBodyMigration],
  [7, "StrictStoredMailTypes", makeSqlMigration(strictStoredMailTypesSql)],
  [8, "StoredMailBounds", makeSqlMigration(storedMailBoundsSql)],
] as const;

export const migrationManifest = migrationEntries.map(([id, name]) => [id, name] as const);

export const makeMigrationLoader = (throughId?: number) =>
  Migrator.fromRecord(
    Object.fromEntries(
      migrationEntries
        .filter(([id]) => throughId === undefined || id <= throughId)
        .map(([id, name, migration]) => [`${id}_${name}`, migration]),
    ),
  );

const run = Migrator.make({});

export interface RunMigrationsOptions {
  readonly toMigrationInclusive?: number | undefined;
}

export const runMigrations = Effect.fn("Database.runMigrations")(function* ({
  toMigrationInclusive,
}: RunMigrationsOptions = {}) {
  const executed = yield* run({ loader: makeMigrationLoader(toMigrationInclusive) });
  const migrations = executed.map(([id, name]) => `${id}_${name}`);

  yield* migrations.length === 0
    ? Effect.logDebug("Database schema is current")
    : Effect.logInfo("Database migrations completed").pipe(Effect.annotateLogs({ migrations }));

  return executed;
});

export const MigrationsLive = Layer.effectDiscard(runMigrations());
