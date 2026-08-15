import { ThreadId, ThreadPage, ThreadPageCursor } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { MailEntityNotFound, MailRepositoryError } from "../Errors.ts";
import { clampPageSize } from "../PageSize.ts";
import { ReadSqlClient } from "../Services/Database.ts";
import {
  StoredAttachment,
  StoredThread,
  ThreadRepository,
  type ThreadRepositoryService,
} from "../Services/Threads.ts";
import {
  AddressRow,
  assembleThreadDetail,
  MessageMailboxRow,
  MessageRow,
  ReferenceRow,
} from "./ThreadHydration.ts";
import { makeThreadScopeCondition } from "./ThreadScope.ts";
import { loadParticipants, ThreadSummaryRow, toThreadSummary } from "./ThreadSummaries.ts";

const makeThreadRepository = Effect.gen(function* () {
  const sql = yield* ReadSqlClient;

  const getThreadRow = SqlSchema.findOneOption({
    Request: ThreadId,
    Result: StoredThread,
    execute: (threadId) => sql`
      SELECT
        id,
        account_id,
        provider_thread_id,
        threading_kind,
        subject,
        created_at,
        updated_at
      FROM threads
      WHERE id = ${threadId}
    `,
  });

  const listMessageRows = SqlSchema.findAll({
    Request: ThreadId,
    Result: MessageRow,
    execute: (threadId) => sql`
      SELECT
        id,
        account_id,
        thread_id,
        provider_message_id,
        internet_message_id,
        in_reply_to,
        subject,
        sent_at,
        received_at,
        preview,
        text_body,
        html_body,
        is_read,
        is_starred,
        is_important,
        is_draft,
        raw_message_blob_hash
      FROM messages
      WHERE thread_id = ${threadId}
      ORDER BY received_at, id
    `,
  });

  const listReferenceRows = SqlSchema.findAll({
    Request: ThreadId,
    Result: ReferenceRow,
    execute: (threadId) => sql`
      SELECT reference_rows.message_id, reference_rows.reference
      FROM message_references reference_rows
      JOIN messages ON messages.id = reference_rows.message_id
      WHERE messages.thread_id = ${threadId}
      ORDER BY reference_rows.message_id, reference_rows.position
    `,
  });

  const listAddressRows = SqlSchema.findAll({
    Request: ThreadId,
    Result: AddressRow,
    execute: (threadId) => sql`
      SELECT address_rows.message_id, address_rows.role,
             address_rows.name, address_rows.address
      FROM message_addresses address_rows
      JOIN messages ON messages.id = address_rows.message_id
      WHERE messages.thread_id = ${threadId}
      ORDER BY address_rows.message_id, address_rows.role, address_rows.position
    `,
  });

  const listMessageMailboxRows = SqlSchema.findAll({
    Request: ThreadId,
    Result: MessageMailboxRow,
    execute: (threadId) => sql`
      SELECT membership.message_id, membership.mailbox_id
      FROM message_mailboxes membership
      JOIN messages ON messages.id = membership.message_id
      WHERE messages.thread_id = ${threadId}
      ORDER BY membership.message_id, membership.mailbox_id
    `,
  });

  const listAttachmentRows = SqlSchema.findAll({
    Request: ThreadId,
    Result: StoredAttachment,
    execute: (threadId) => sql`
      SELECT
        attachments.id,
        attachments.message_id,
        attachments.provider_attachment_id,
        attachments.filename,
        attachments.media_type,
        attachments.size_bytes,
        attachments.content_id,
        attachments.disposition,
        attachments.blob_hash
      FROM attachments
      JOIN messages ON messages.id = attachments.message_id
      WHERE messages.thread_id = ${threadId}
      ORDER BY attachments.message_id, attachments.id
    `,
  });

  const queryInTransaction = Effect.fnUntraced(function* ({
    scope,
    limit: requestedLimit,
    cursor,
  }: Parameters<ThreadRepositoryService["query"]>[0]) {
    const limit = clampPageSize(requestedLimit);
    const scopeCondition = makeThreadScopeCondition(sql, scope, "summaries");
    const cursorCondition =
      cursor === null
        ? sql`1 = 1`
        : sql`(
            summaries.last_message_at < ${cursor.lastMessageAt}
            OR (
              summaries.last_message_at = ${cursor.lastMessageAt}
              AND summaries.id > ${cursor.threadId}
            )
          )`;

    const rows = yield* sql<typeof ThreadSummaryRow.Type>`
      SELECT
        summaries.id,
        summaries.account_id,
        summaries.subject,
        summaries.preview,
        summaries.last_message_at,
        summaries.message_count,
        summaries.unread_count,
        summaries.has_attachments
      FROM thread_summaries summaries
      WHERE ${scopeCondition} AND ${cursorCondition}
      ORDER BY summaries.last_message_at DESC, summaries.id ASC
      LIMIT ${limit + 1}
    `.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(ThreadSummaryRow))),
      Effect.mapError(
        (cause) =>
          new MailRepositoryError({
            operation: "queryThreads",
            message: "Failed to query mail threads.",
            cause,
          }),
      ),
    );

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const participants = yield* loadParticipants(
      sql,
      pageRows.map((row) => row.id),
    );
    const items = pageRows.map((row) => toThreadSummary(row, participants));
    const last = pageRows.at(-1);

    return ThreadPage.make({
      items,
      nextCursor:
        hasMore && last !== undefined
          ? ThreadPageCursor.make({ lastMessageAt: last.lastMessageAt, threadId: last.id })
          : null,
    });
  });

  const query: ThreadRepositoryService["query"] = Effect.fn("ThreadRepository.query")((input) =>
    sql.withTransaction(queryInTransaction(input)).pipe(
      Effect.catchTag(
        "SqlError",
        (cause) =>
          new MailRepositoryError({
            operation: "queryThreads.transaction",
            message: "Failed to read a coherent thread page.",
            cause,
          }),
      ),
    ),
  );

  const readInTransaction = Effect.fnUntraced(function* (threadId) {
    const threadOption = yield* getThreadRow(threadId).pipe(
      Effect.mapError(
        (cause) =>
          new MailRepositoryError({
            operation: "readThread.thread",
            message: "Failed to load the requested thread.",
            cause,
          }),
      ),
    );
    if (Option.isNone(threadOption)) {
      return yield* new MailEntityNotFound({ entity: "thread", id: threadId });
    }

    const [messageRows, referenceRows, addressRows, mailboxRows, attachmentRows] =
      yield* Effect.all(
        [
          listMessageRows(threadId),
          listReferenceRows(threadId),
          listAddressRows(threadId),
          listMessageMailboxRows(threadId),
          listAttachmentRows(threadId),
        ],
        { concurrency: 1 },
      ).pipe(
        Effect.mapError(
          (cause) =>
            new MailRepositoryError({
              operation: "readThread.relatedRows",
              message: "Failed to load the messages related to the requested thread.",
              cause,
            }),
        ),
      );

    return yield* assembleThreadDetail(
      threadOption.value,
      messageRows,
      referenceRows,
      addressRows,
      mailboxRows,
      attachmentRows,
    );
  });

  const read: ThreadRepositoryService["read"] = Effect.fn("ThreadRepository.read")((threadId) =>
    sql.withTransaction(readInTransaction(threadId)).pipe(
      Effect.catchTag(
        "SqlError",
        (cause) =>
          new MailRepositoryError({
            operation: "readThread.transaction",
            message: "Failed to read a coherent thread detail.",
            cause,
          }),
      ),
    ),
  );

  return ThreadRepository.of({ query, read });
});

export const ThreadRepositoryLive = Layer.effect(ThreadRepository, makeThreadRepository);
