import { assert, describe, it } from "@effect/vitest";
import { AllThreadScope, MailboxThreadScope } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { fixtureIds } from "../Fixtures.ts";
import { seedMailFixture } from "../Seed.ts";
import { ThreadSearchRepository } from "../Services/ThreadSearch.ts";
import { SqliteMemory } from "./Sqlite.ts";
import { ThreadSearchRepositoryLive } from "./ThreadSearch.ts";

const ThreadSearchTestLive = ThreadSearchRepositoryLive.pipe(Layer.provideMerge(SqliteMemory));

describe("SQLite thread search repository", () => {
  it.effect("searches message fields and groups matches by thread", () =>
    Effect.gen(function* () {
      const repository = yield* ThreadSearchRepository;
      yield* seedMailFixture();

      const result = yield* repository.search({
        scope: AllThreadScope.make({}),
        query: "migration",
        limit: 20,
        cursor: null,
      });
      assert.strictEqual(result.items.length, 1);
      assert.strictEqual(result.items[0]?.thread.id, fixtureIds.threads.migration);
      assert.strictEqual(result.items[0]?.match.matchingMessageCount, 2);
      assert(result.items[0]?.match.highlights.length !== 0);
      assert(!result.items[0]?.match.excerpt.includes("\uE000"));

      const prefixResult = yield* repository.search({
        scope: AllThreadScope.make({}),
        query: "mosa",
        limit: 20,
        cursor: null,
      });
      assert(
        prefixResult.items.some(({ thread }) => thread.id === fixtureIds.threads.annualReport),
      );

      const scopedResult = yield* repository.search({
        scope: MailboxThreadScope.make({ mailboxId: fixtureIds.mailboxes.imapInbox }),
        query: "local",
        limit: 20,
        cursor: null,
      });
      assert.deepStrictEqual(
        scopedResult.items.map(({ thread }) => thread.id),
        [fixtureIds.threads.newsletter],
      );

      const htmlBodyResult = yield* repository.search({
        scope: AllThreadScope.make({}),
        query: "ownership",
        limit: 20,
        cursor: null,
      });
      assert.deepStrictEqual(
        htmlBodyResult.items.map(({ thread }) => thread.id),
        [fixtureIds.threads.newsletter],
      );
    }).pipe(Effect.provide(ThreadSearchTestLive)),
  );
});
