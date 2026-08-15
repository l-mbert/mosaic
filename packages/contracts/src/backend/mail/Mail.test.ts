import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { BackendRpcs } from "../Backend.ts";
import {
  AllThreadScope,
  QueryThreads,
  SearchMail,
  ThreadSearchCursor,
  ThreadId,
  ThreadPageCursor,
} from "./Mail.ts";

describe("mail backend contract", () => {
  it("registers the complete read-only mail surface", () => {
    assert.deepStrictEqual(
      ["ListAccounts", "ListMailboxes", "QueryThreads", "ReadThread", "SearchMail"].filter((name) =>
        BackendRpcs.requests.has(name),
      ),
      ["ListAccounts", "ListMailboxes", "QueryThreads", "ReadThread", "SearchMail"],
    );
  });

  it.effect("decodes scoped pagination payloads", () =>
    Effect.gen(function* () {
      const threads = yield* Schema.decodeUnknownEffect(QueryThreads.payloadSchema)({
        scope: AllThreadScope.make({}),
        limit: 25,
        cursor: ThreadPageCursor.make({
          lastMessageAt: "2026-08-12T09:20:00.000Z",
          threadId: ThreadId.make("thread-imap-migration"),
        }),
      });
      const search = yield* Schema.decodeUnknownEffect(SearchMail.payloadSchema)({
        scope: AllThreadScope.make({}),
        query: "migration",
        limit: 20,
        cursor: ThreadSearchCursor.make({ offset: 20 }),
      });

      assert.strictEqual(threads.limit, 25);
      assert.strictEqual(search.query, "migration");
      assert.strictEqual(search.cursor?.offset, 20);
    }),
  );

  it.effect("enforces query input constraints", () =>
    Effect.gen(function* () {
      const invalidLimit = yield* Effect.result(
        Schema.decodeUnknownEffect(QueryThreads.payloadSchema)({
          scope: AllThreadScope.make({}),
          limit: 0,
          cursor: null,
        }),
      );
      const blankSearch = yield* Effect.result(
        Schema.decodeUnknownEffect(SearchMail.payloadSchema)({
          scope: AllThreadScope.make({}),
          query: "   ",
          limit: 20,
          cursor: null,
        }),
      );
      const negativeOffset = yield* Effect.result(
        Schema.decodeUnknownEffect(SearchMail.payloadSchema)({
          scope: AllThreadScope.make({}),
          query: "mail",
          limit: 20,
          cursor: { offset: -1 },
        }),
      );
      const invalidTimestamp = yield* Effect.result(
        Schema.decodeUnknownEffect(QueryThreads.payloadSchema)({
          scope: AllThreadScope.make({}),
          limit: 20,
          cursor: { lastMessageAt: "not-a-timestamp", threadId: "thread-1" },
        }),
      );

      assert.strictEqual(invalidLimit._tag, "Failure");
      assert.strictEqual(blankSearch._tag, "Failure");
      assert.strictEqual(negativeOffset._tag, "Failure");
      assert.strictEqual(invalidTimestamp._tag, "Failure");
    }),
  );
});
