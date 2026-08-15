import {
  MessageId,
  ThreadSearchCursor,
  type ThreadSearchHighlight,
  ThreadSearchPage,
  ThreadSearchResult,
} from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { MailRepositoryError } from "../Errors.ts";
import { clampPageSize } from "../PageSize.ts";
import { ReadSqlClient } from "../Services/Database.ts";
import {
  ThreadSearchRepository,
  type ThreadSearchRepositoryService,
} from "../Services/ThreadSearch.ts";
import { makeThreadScopeCondition } from "./ThreadScope.ts";
import { loadParticipants, ThreadSummaryRow, toThreadSummary } from "./ThreadSummaries.ts";

const HIGHLIGHT_START = "\uE000";
const HIGHLIGHT_END = "\uE001";

const SearchRow = Schema.Struct({
  ...ThreadSummaryRow.fields,
  messageId: MessageId,
  excerpt: Schema.String,
  matchingMessageCount: Schema.Natural,
});

export const compileFtsQuery = (query: string): string =>
  query
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0)
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(" ");

const parseHighlightedExcerpt = (marked: string) => {
  let excerpt = "";
  let sourceOffset = 0;
  let highlightStart: number | null = null;
  const highlights: Array<ThreadSearchHighlight> = [];

  while (sourceOffset < marked.length) {
    if (marked.startsWith(HIGHLIGHT_START, sourceOffset)) {
      highlightStart = excerpt.length;
      sourceOffset += HIGHLIGHT_START.length;
      continue;
    }
    if (marked.startsWith(HIGHLIGHT_END, sourceOffset)) {
      if (highlightStart !== null && highlightStart < excerpt.length) {
        highlights.push({ start: highlightStart, end: excerpt.length });
      }
      highlightStart = null;
      sourceOffset += HIGHLIGHT_END.length;
      continue;
    }

    excerpt += marked[sourceOffset];
    sourceOffset += 1;
  }

  if (highlightStart !== null && highlightStart < excerpt.length) {
    highlights.push({ start: highlightStart, end: excerpt.length });
  }

  return { excerpt, highlights };
};

const makeThreadSearchRepository = Effect.gen(function* () {
  const sql = yield* ReadSqlClient;

  const searchInTransaction = Effect.fnUntraced(function* ({
    scope,
    query,
    limit: requestedLimit,
    cursor,
  }: Parameters<ThreadSearchRepositoryService["search"]>[0]) {
    const compiledQuery = compileFtsQuery(query);
    if (compiledQuery.length === 0) {
      return ThreadSearchPage.make({ items: [], nextCursor: null });
    }

    const limit = clampPageSize(requestedLimit);
    const offset = Math.max(0, cursor?.offset ?? 0);
    const scopeCondition = makeThreadScopeCondition(sql, scope, "summaries");

    const rows = yield* sql<typeof SearchRow.Type>`
      WITH matches AS (
        SELECT
          messages.thread_id AS thread_id,
          messages.id AS message_id,
          bm25(message_fts, 8.0, 5.0, 3.0, 1.0) AS rank,
          snippet(
            message_fts,
            -1,
            ${HIGHLIGHT_START},
            ${HIGHLIGHT_END},
            ' … ',
            24
          ) AS excerpt
        FROM message_fts
        JOIN message_search indexed_messages ON indexed_messages.rowid = message_fts.rowid
        JOIN messages ON messages.id = indexed_messages.message_id
        JOIN thread_summaries summaries
          ON summaries.id = messages.thread_id
          AND summaries.account_id = messages.account_id
        WHERE message_fts MATCH ${compiledQuery}
          AND ${scopeCondition}
      ),
      ranked AS (
        SELECT
          matches.*,
          COUNT(*) OVER (PARTITION BY matches.thread_id) AS matching_message_count,
          ROW_NUMBER() OVER (
            PARTITION BY matches.thread_id
            ORDER BY matches.rank, matches.message_id
          ) AS match_number
        FROM matches
      )
      SELECT
        summaries.id,
        summaries.account_id AS "accountId",
        summaries.subject,
        summaries.preview,
        summaries.last_message_at AS "lastMessageAt",
        summaries.message_count AS "messageCount",
        summaries.unread_count AS "unreadCount",
        summaries.has_attachments AS "hasAttachments",
        ranked.message_id AS "messageId",
        ranked.excerpt,
        ranked.matching_message_count AS "matchingMessageCount"
      FROM ranked
      JOIN thread_summaries summaries ON summaries.id = ranked.thread_id
      WHERE ranked.match_number = 1
      ORDER BY ranked.rank, summaries.last_message_at DESC, summaries.id
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(SearchRow))),
      Effect.mapError(
        (cause) =>
          new MailRepositoryError({
            operation: "searchMail",
            message: "Failed to search mail.",
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
    const items = pageRows.map((row) => {
      const { excerpt, highlights } = parseHighlightedExcerpt(row.excerpt);
      return ThreadSearchResult.make({
        thread: toThreadSummary(row, participants),
        match: {
          messageId: row.messageId,
          excerpt,
          highlights,
          matchingMessageCount: row.matchingMessageCount,
        },
      });
    });

    return ThreadSearchPage.make({
      items,
      nextCursor: hasMore ? ThreadSearchCursor.make({ offset: offset + limit }) : null,
    });
  });

  const search: ThreadSearchRepositoryService["search"] = Effect.fn(
    "ThreadSearchRepository.search",
  )((input) =>
    sql.withTransaction(searchInTransaction(input)).pipe(
      Effect.catchTag(
        "SqlError",
        (cause) =>
          new MailRepositoryError({
            operation: "searchMail.transaction",
            message: "Failed to read a coherent search page.",
            cause,
          }),
      ),
    ),
  );

  return ThreadSearchRepository.of({ search });
});

export const ThreadSearchRepositoryLive = Layer.effect(
  ThreadSearchRepository,
  makeThreadSearchRepository,
);
