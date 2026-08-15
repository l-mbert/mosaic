import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { MailAddress } from "./Addresses.ts";
import { BackendMailError } from "./Errors.ts";
import { AccountId, ThreadId } from "./Ids.ts";
import { MailMessage } from "./Messages.ts";
import { PageLimit } from "./Pagination.ts";
import { ThreadScope } from "./ThreadScope.ts";
import { UtcTimestamp } from "./Timestamps.ts";

export const MailThread = Schema.Struct({
  id: ThreadId,
  accountId: AccountId,
  subject: Schema.String,
  createdAt: UtcTimestamp,
  updatedAt: UtcTimestamp,
});
export type MailThread = typeof MailThread.Type;

export const ThreadSummary = Schema.Struct({
  id: ThreadId,
  accountId: AccountId,
  subject: Schema.String,
  participants: Schema.Array(MailAddress),
  preview: Schema.String,
  lastMessageAt: UtcTimestamp,
  messageCount: Schema.Natural,
  unreadCount: Schema.Natural,
  hasAttachments: Schema.Boolean,
});
export type ThreadSummary = typeof ThreadSummary.Type;

export const ThreadDetail = Schema.Struct({
  thread: MailThread,
  messages: Schema.Array(MailMessage),
});
export type ThreadDetail = typeof ThreadDetail.Type;

export const ThreadPageCursor = Schema.Struct({
  lastMessageAt: UtcTimestamp,
  threadId: ThreadId,
});
export type ThreadPageCursor = typeof ThreadPageCursor.Type;

export const ThreadPage = Schema.Struct({
  items: Schema.Array(ThreadSummary),
  nextCursor: Schema.NullOr(ThreadPageCursor),
});
export type ThreadPage = typeof ThreadPage.Type;

export const QueryThreads = Rpc.make("QueryThreads", {
  payload: Schema.Struct({
    scope: ThreadScope,
    limit: PageLimit,
    cursor: Schema.NullOr(ThreadPageCursor),
  }),
  success: ThreadPage,
  error: BackendMailError,
});

export const ReadThread = Rpc.make("ReadThread", {
  payload: Schema.Struct({ threadId: ThreadId }),
  success: ThreadDetail,
  error: BackendMailError,
});
