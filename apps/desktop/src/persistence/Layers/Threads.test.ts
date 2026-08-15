import { assert, describe, it } from "@effect/vitest";
import { AllThreadScope, MailboxThreadScope } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { fixtureIds } from "../Fixtures.ts";
import { seedMailFixture } from "../Seed.ts";
import { ThreadRepository } from "../Services/Threads.ts";
import { SqliteMemory } from "./Sqlite.ts";
import { ThreadRepositoryLive } from "./Threads.ts";

const ThreadsTestLive = ThreadRepositoryLive.pipe(Layer.provideMerge(SqliteMemory));

describe("SQLite thread repository", () => {
  it.effect("hydrates normalized thread records", () =>
    Effect.gen(function* () {
      const repository = yield* ThreadRepository;
      yield* seedMailFixture();

      const thread = yield* repository.read(fixtureIds.threads.annualReport);
      assert.strictEqual(thread.thread.threadingKind, "provider");
      assert.strictEqual(thread.messages.length, 2);
      assert.strictEqual(thread.messages[0]?.attachments[0]?.filename, "q3-annual-report.pdf");
      assert.deepStrictEqual(thread.messages[1]?.references, ["<annual-report-1@northstar.test>"]);
      assert(thread.messages[0]?.body.html?.includes("<script>"));
    }).pipe(Effect.provide(ThreadsTestLive)),
  );

  it.effect("queries pages with stable scopes and cursors", () =>
    Effect.gen(function* () {
      const repository = yield* ThreadRepository;
      yield* seedMailFixture();

      const firstPage = yield* repository.query({
        scope: AllThreadScope.make({}),
        limit: 2,
        cursor: null,
      });
      assert.strictEqual(firstPage.items.length, 2);
      assert(firstPage.nextCursor !== null);
      assert.strictEqual(firstPage.items[0]?.id, fixtureIds.threads.migration);

      const secondPage = yield* repository.query({
        scope: AllThreadScope.make({}),
        limit: 2,
        cursor: firstPage.nextCursor,
      });
      assert.strictEqual(secondPage.items.length, 2);
      assert.strictEqual(secondPage.nextCursor, null);
      assert.notStrictEqual(firstPage.items[0]?.id, secondPage.items[0]?.id);

      const work = yield* repository.query({
        scope: MailboxThreadScope.make({ mailboxId: fixtureIds.mailboxes.gmailWork }),
        limit: 20,
        cursor: null,
      });
      assert.deepStrictEqual(
        work.items.map(({ id }) => id),
        [fixtureIds.threads.annualReport],
      );
      assert.strictEqual(work.items[0]?.messageCount, 2);
      assert.strictEqual(work.items[0]?.unreadCount, 1);
      assert.strictEqual(work.items[0]?.hasAttachments, true);

      const allThreads = [...firstPage.items, ...secondPage.items];
      const designReview = allThreads.find(({ id }) => id === fixtureIds.threads.designReview);
      assert.deepStrictEqual(
        designReview?.participants.map(({ address }) => address),
        ["mira@mosaic.test", "product@mosaic.test"],
      );
    }).pipe(Effect.provide(ThreadsTestLive)),
  );
});
