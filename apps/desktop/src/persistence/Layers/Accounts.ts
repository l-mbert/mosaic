import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { MailRepositoryError } from "../Errors.ts";
import { ReadSqlClient } from "../Services/Database.ts";
import {
  AccountRepository,
  type AccountRepositoryService,
  StoredAccount,
} from "../Services/Accounts.ts";

const makeAccountRepository = Effect.gen(function* () {
  const sql = yield* ReadSqlClient;

  const listRows = SqlSchema.findAll({
    Request: Schema.Void,
    Result: StoredAccount,
    execute: () => sql`
      SELECT
        id,
        provider_kind,
        provider_account_id,
        display_name,
        email_address,
        created_at,
        updated_at
      FROM accounts
      ORDER BY created_at, id
    `,
  });

  const list: AccountRepositoryService["list"] = listRows().pipe(
    Effect.mapError(
      (cause) =>
        new MailRepositoryError({
          operation: "listAccounts",
          message: "Failed to list mail accounts.",
          cause,
        }),
    ),
    Effect.withSpan("AccountRepository.list"),
  );

  return AccountRepository.of({ list });
});

export const AccountRepositoryLive = Layer.effect(AccountRepository, makeAccountRepository);
