import {
  AccountId,
  MailAddress,
  ThreadId,
  ThreadSummary,
  UtcTimestamp,
} from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as SqlClient from "effect/unstable/sql/SqlClient";

import { MailRepositoryError } from "../Errors.ts";

export const ThreadSummaryRow = Schema.Struct({
  id: ThreadId,
  accountId: AccountId,
  subject: Schema.String,
  preview: Schema.String,
  lastMessageAt: UtcTimestamp,
  messageCount: Schema.Natural,
  unreadCount: Schema.Natural,
  hasAttachments: Schema.BooleanFromBit,
});
export type ThreadSummaryRow = typeof ThreadSummaryRow.Type;

const ParticipantRow = Schema.Struct({
  threadId: ThreadId,
  name: Schema.NullOr(Schema.String),
  address: MailAddress.fields.address,
});

export const loadParticipants = Effect.fn("ThreadRepository.loadParticipants")(function* (
  sql: SqlClient.SqlClient,
  threadIds: ReadonlyArray<ThreadId>,
) {
  const participants = new Map<ThreadId, Array<MailAddress>>();
  if (threadIds.length === 0) return participants;

  const rows = yield* sql<typeof ParticipantRow.Type>`
    WITH ranked_participants AS (
      SELECT
        messages.thread_id AS "threadId",
        addresses.name,
        addresses.address,
        ROW_NUMBER() OVER (
          PARTITION BY messages.thread_id, lower(trim(addresses.address))
          ORDER BY
            CASE WHEN addresses.name IS NULL OR length(trim(addresses.name)) = 0 THEN 1 ELSE 0 END,
            messages.received_at DESC,
            CASE addresses.role
              WHEN 'from' THEN 0
              WHEN 'to' THEN 1
              WHEN 'cc' THEN 2
              ELSE 3
            END,
            addresses.position,
            messages.id
        ) AS address_rank
      FROM messages
      JOIN accounts ON accounts.id = messages.account_id
      JOIN message_addresses addresses ON addresses.message_id = messages.id
      WHERE messages.thread_id IN ${sql.in(threadIds)}
        AND addresses.role IN ('from', 'to', 'cc', 'bcc')
        AND lower(trim(addresses.address)) <> lower(trim(accounts.email_address))
    )
    SELECT "threadId", name, address
    FROM ranked_participants
    WHERE address_rank = 1
    ORDER BY "threadId", lower(address)
  `.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(ParticipantRow))),
    Effect.mapError(
      (cause) =>
        new MailRepositoryError({
          operation: "loadParticipants",
          message: "Failed to load thread participants.",
          cause,
        }),
    ),
  );

  for (const row of rows) {
    const values = participants.get(row.threadId) ?? [];
    values.push(MailAddress.make({ name: row.name, address: row.address }));
    participants.set(row.threadId, values);
  }

  return participants;
});

export const toThreadSummary = (
  row: ThreadSummaryRow,
  participants: ReadonlyMap<ThreadId, ReadonlyArray<MailAddress>>,
) =>
  ThreadSummary.make({
    id: row.id,
    accountId: row.accountId,
    subject: row.subject,
    participants: participants.get(row.id) ?? [],
    preview: row.preview,
    lastMessageAt: row.lastMessageAt,
    messageCount: row.messageCount,
    unreadCount: row.unreadCount,
    hasAttachments: row.hasAttachments,
  });
