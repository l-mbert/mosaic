import { assert, describe, it } from "@effect/vitest";

import { mailFixture } from "./Fixtures.ts";

describe("canonical mail fixtures", () => {
  it("forms a coherent multi-provider model", () => {
    assert.deepStrictEqual(
      mailFixture.accounts.map(({ providerKind }) => providerKind),
      ["gmail", "microsoft-graph", "imap"],
    );
    assert(mailFixture.mailboxes.some(({ kind }) => kind === "label"));
    assert(mailFixture.mailboxes.some(({ kind }) => kind === "folder"));
    assert(mailFixture.threads.some(({ threadingKind }) => threadingKind === "provider"));
    assert(mailFixture.threads.some(({ threadingKind }) => threadingKind === "headers"));
    assert(mailFixture.threads.some(({ threadingKind }) => threadingKind === "singleton"));
  });
});
