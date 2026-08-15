import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as String from "effect/String";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import { ReadSqlClient } from "../Services/Database.ts";

export interface SqliteConfig {
  readonly filename: string;
}

export const sqliteNameTransforms = {
  transformQueryNames: String.camelToSnake,
  transformResultNames: String.snakeToCamel,
} satisfies Pick<SqliteClient.SqliteClientConfig, "transformQueryNames" | "transformResultNames">;

export const makeSqliteLayer = ({ filename }: SqliteConfig) => {
  const spanAttributes = {
    "db.system.name": "sqlite",
    "service.name": "mosaic-desktop-utility",
  };
  const writable = SqliteClient.layer({ filename, spanAttributes, ...sqliteNameTransforms });
  const initialized = Layer.effect(
    ReadSqlClient,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`PRAGMA foreign_keys = ON`;
      yield* runMigrations();

      if (filename === ":memory:") {
        return sql;
      }

      return yield* SqliteClient.make({
        filename,
        readonly: true,
        spanAttributes,
        ...sqliteNameTransforms,
      });
    }),
  ).pipe(Layer.provide(Reactivity.layer));

  return Layer.provideMerge(initialized, writable);
};

export const SqliteMemory = makeSqliteLayer({ filename: ":memory:" });
