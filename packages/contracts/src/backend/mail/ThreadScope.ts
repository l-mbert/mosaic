import * as Schema from "effect/Schema";

import { AccountId, MailboxId } from "./Ids.ts";

export const ThreadScope = Schema.TaggedUnion({
  All: {},
  Account: { accountId: AccountId },
  Mailbox: { mailboxId: MailboxId },
});
export const {
  All: AllThreadScope,
  Account: AccountThreadScope,
  Mailbox: MailboxThreadScope,
} = ThreadScope.cases;
export type ThreadScope = typeof ThreadScope.Type;
