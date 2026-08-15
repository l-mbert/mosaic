import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { MailFixture, mailFixture } from "./Fixtures.ts";

describe("canonical mail fixtures", () => {
  it.effect("decode as a coherent multi-provider model", () =>
    Effect.gen(function* () {
      const fixture = yield* Schema.decodeUnknownEffect(MailFixture)(mailFixture);

      assert.deepStrictEqual(
        fixture.accounts.map(({ providerKind }) => providerKind),
        ["gmail", "microsoft-graph", "imap"],
      );
      assert(fixture.mailboxes.some(({ kind }) => kind === "label"));
      assert(fixture.mailboxes.some(({ kind }) => kind === "folder"));
      assert(fixture.threads.some(({ threadingKind }) => threadingKind === "provider"));
      assert(fixture.threads.some(({ threadingKind }) => threadingKind === "headers"));
      assert(fixture.threads.some(({ threadingKind }) => threadingKind === "singleton"));
    }),
  );
});
