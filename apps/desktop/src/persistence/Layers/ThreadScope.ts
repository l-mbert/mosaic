import type { ThreadScope } from "@mosaic/contracts/backend/mail";
import * as Match from "effect/Match";
import type * as SqlClient from "effect/unstable/sql/SqlClient";

export const makeThreadScopeCondition = (
  sql: SqlClient.SqlClient,
  scope: ThreadScope,
  threadAlias: string,
) => {
  const thread = sql(threadAlias);
  const threadAccount = sql`${thread}.account_id`;
  const threadId = sql`${thread}.id`;

  return Match.value(scope).pipe(
    Match.tag("All", () => sql`1 = 1`),
    Match.tag("Account", ({ accountId }) => sql`${threadAccount} = ${accountId}`),
    Match.tag(
      "Mailbox",
      ({ mailboxId }) => sql`EXISTS (
        SELECT 1
        FROM messages scope_messages
        JOIN message_mailboxes scope_membership
          ON scope_membership.message_id = scope_messages.id
        WHERE scope_messages.thread_id = ${threadId}
          AND scope_membership.mailbox_id = ${mailboxId}
      )`,
    ),
    Match.exhaustive,
  );
};
