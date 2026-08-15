import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AccountRepositoryLive } from "./Layers/Accounts.ts";
import { MailboxRepositoryLive } from "./Layers/Mailboxes.ts";
import { SqliteMemory } from "./Layers/Sqlite.ts";
import { seedMailFixture } from "./Seed.ts";
import { AccountRepository } from "./Services/Accounts.ts";
import { MailboxRepository } from "./Services/Mailboxes.ts";

const SeedTestLive = Layer.mergeAll(AccountRepositoryLive, MailboxRepositoryLive).pipe(
  Layer.provideMerge(SqliteMemory),
);

describe("mail fixture seeding", () => {
  it.effect("seeds only an empty database and preserves provider-shaped records", () =>
    Effect.gen(function* () {
      const accountsRepository = yield* AccountRepository;
      const mailboxesRepository = yield* MailboxRepository;
      const firstSeed = yield* seedMailFixture();
      const secondSeed = yield* seedMailFixture();

      assert.strictEqual(firstSeed.status, "seeded");
      assert.strictEqual(firstSeed.accountCount, 3);
      assert.strictEqual(secondSeed.status, "already-populated");

      const accounts = yield* accountsRepository.list;
      assert.deepStrictEqual(
        accounts.map(({ providerKind }) => providerKind),
        ["gmail", "microsoft-graph", "imap"],
      );

      const mailboxes = yield* mailboxesRepository.list(null);
      assert(mailboxes.some(({ kind }) => kind === "label"));
      assert(mailboxes.some(({ kind }) => kind === "folder"));
    }).pipe(Effect.provide(SeedTestLive)),
  );
});
