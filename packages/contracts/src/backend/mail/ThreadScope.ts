import * as Schema from "effect/Schema";

import { AccountId, MailboxId } from "./Ids.ts";

export const AllThreadScope = Schema.TaggedStruct("All", {});
export const AccountThreadScope = Schema.TaggedStruct("Account", { accountId: AccountId });
export const MailboxThreadScope = Schema.TaggedStruct("Mailbox", { mailboxId: MailboxId });
export const ThreadScope = Schema.Union([AllThreadScope, AccountThreadScope, MailboxThreadScope]);
export type ThreadScope = typeof ThreadScope.Type;
