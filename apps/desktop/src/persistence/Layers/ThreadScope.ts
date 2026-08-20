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
      ({ mailboxId }) => sql`${threadId} IN (
        SELECT scope_messages.thread_id
        FROM message_mailboxes scope_membership
        JOIN messages scope_messages ON scope_messages.id = scope_membership.message_id
        WHERE scope_membership.mailbox_id = ${mailboxId}
      )`,
    ),
    Match.exhaustive,
  );
};
