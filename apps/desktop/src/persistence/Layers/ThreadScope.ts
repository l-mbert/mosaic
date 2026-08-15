import type { ThreadScope } from "@mosaic/contracts/backend/mail";
import type * as SqlClient from "effect/unstable/sql/SqlClient";

export const makeThreadScopeCondition = (
  sql: SqlClient.SqlClient,
  scope: ThreadScope,
  threadAlias: string,
) => {
  const thread = sql(threadAlias);
  const threadAccount = sql`${thread}.account_id`;
  const threadId = sql`${thread}.id`;

  switch (scope._tag) {
    case "All":
      return sql`1 = 1`;
    case "Account":
      return sql`${threadAccount} = ${scope.accountId}`;
    case "Mailbox":
      return sql`EXISTS (
        SELECT 1
        FROM messages scope_messages
        JOIN message_mailboxes scope_membership
          ON scope_membership.message_id = scope_messages.id
        WHERE scope_messages.thread_id = ${threadId}
          AND scope_membership.mailbox_id = ${scope.mailboxId}
      )`;
    default:
      scope satisfies never;
      throw new Error("Unexpected mail scope.");
  }
};
