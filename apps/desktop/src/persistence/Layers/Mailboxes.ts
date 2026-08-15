import { AccountId } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { MailRepositoryError } from "../Errors.ts";
import { ReadSqlClient } from "../Services/Database.ts";
import {
  MailboxRepository,
  type MailboxRepositoryService,
  StoredMailbox,
} from "../Services/Mailboxes.ts";

const makeMailboxRepository = Effect.gen(function* () {
  const sql = yield* ReadSqlClient;

  const listRows = SqlSchema.findAll({
    Request: Schema.NullOr(AccountId),
    Result: StoredMailbox,
    execute: (accountId) =>
      accountId === null
        ? sql`
            SELECT
              id,
              account_id AS "accountId",
              provider_mailbox_id AS "providerMailboxId",
              name,
              kind,
              role,
              parent_id AS "parentId"
            FROM mailboxes
            ORDER BY account_id, CASE WHEN role = 'inbox' THEN 0 ELSE 1 END, name, id
          `
        : sql`
            SELECT
              id,
              account_id AS "accountId",
              provider_mailbox_id AS "providerMailboxId",
              name,
              kind,
              role,
              parent_id AS "parentId"
            FROM mailboxes
            WHERE account_id = ${accountId}
            ORDER BY CASE WHEN role = 'inbox' THEN 0 ELSE 1 END, name, id
          `,
  });

  const list: MailboxRepositoryService["list"] = Effect.fn("MailboxRepository.list")((accountId) =>
    listRows(accountId).pipe(
      Effect.mapError(
        (cause) =>
          new MailRepositoryError({
            operation: "listMailboxes",
            message: "Failed to list mailboxes.",
            cause,
          }),
      ),
    ),
  );

  return MailboxRepository.of({ list });
});

export const MailboxRepositoryLive = Layer.effect(MailboxRepository, makeMailboxRepository);
