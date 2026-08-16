import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { Address } from "./Addresses.ts";
import { NotFoundError, StorageError } from "./Errors.ts";
import { AccountId, ThreadId } from "./Ids.ts";
import { Message } from "./Messages.ts";
import { PageLimit } from "./Pagination.ts";
import { ThreadScope } from "./ThreadScope.ts";

export const Thread = Schema.Struct({
  id: ThreadId,
  accountId: AccountId,
  subject: Schema.String,
  createdAt: Schema.DateTimeUtcFromString,
  updatedAt: Schema.DateTimeUtcFromString,
});
export type Thread = typeof Thread.Type;

export const ThreadSummary = Schema.Struct({
  id: ThreadId,
  accountId: AccountId,
  subject: Schema.String,
  participants: Schema.Array(Address),
  preview: Schema.String,
  lastMessageAt: Schema.DateTimeUtcFromString,
  messageCount: Schema.Natural,
  unreadCount: Schema.Natural,
  hasAttachments: Schema.Boolean,
});
export type ThreadSummary = typeof ThreadSummary.Type;

export const ThreadDetail = Schema.Struct({
  thread: Thread,
  messages: Schema.Array(Message),
});
export type ThreadDetail = typeof ThreadDetail.Type;

export const ThreadPageCursor = Schema.Struct({
  lastMessageAt: Schema.DateTimeUtcFromString,
  threadId: ThreadId,
});
export type ThreadPageCursor = typeof ThreadPageCursor.Type;

export const ThreadPage = Schema.Struct({
  items: Schema.Array(ThreadSummary),
  nextCursor: Schema.NullOr(ThreadPageCursor),
});
export type ThreadPage = typeof ThreadPage.Type;

export const QueryThreads = Rpc.make("QueryThreads", {
  payload: {
    scope: ThreadScope,
    limit: PageLimit,
    cursor: Schema.NullOr(ThreadPageCursor),
  },
  success: ThreadPage,
  error: StorageError,
});

export const ReadThread = Rpc.make("ReadThread", {
  payload: { threadId: ThreadId },
  success: ThreadDetail,
  error: Schema.Union([NotFoundError, StorageError]),
});
