import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { StorageError } from "./Errors.ts";
import { MessageId } from "./Ids.ts";
import { PageLimit } from "./Pagination.ts";
import { ThreadScope } from "./ThreadScope.ts";
import { ThreadSummary } from "./Threads.ts";

export const ThreadSearchCursor = Schema.Struct({ offset: Schema.Natural });
export type ThreadSearchCursor = typeof ThreadSearchCursor.Type;

export const ThreadSearchHighlight = Schema.Struct({
  start: Schema.Natural,
  end: Schema.Natural,
});
export type ThreadSearchHighlight = typeof ThreadSearchHighlight.Type;

export const ThreadSearchMatch = Schema.Struct({
  messageId: MessageId,
  excerpt: Schema.String,
  highlights: Schema.Array(ThreadSearchHighlight),
  matchingMessageCount: Schema.Natural,
});
export type ThreadSearchMatch = typeof ThreadSearchMatch.Type;

export const ThreadSearchResult = Schema.Struct({
  thread: ThreadSummary,
  match: ThreadSearchMatch,
});
export type ThreadSearchResult = typeof ThreadSearchResult.Type;

export const ThreadSearchPage = Schema.Struct({
  items: Schema.Array(ThreadSearchResult),
  nextCursor: Schema.NullOr(ThreadSearchCursor),
});
export type ThreadSearchPage = typeof ThreadSearchPage.Type;

export const SearchThreads = Rpc.make("SearchThreads", {
  payload: {
    scope: ThreadScope,
    query: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(500)),
    limit: PageLimit,
    cursor: Schema.NullOr(ThreadSearchCursor),
  },
  success: ThreadSearchPage,
  error: StorageError,
});
