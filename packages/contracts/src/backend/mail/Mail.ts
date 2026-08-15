import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { ListAccounts } from "./Accounts.ts";
import { ListMailboxes } from "./Mailboxes.ts";
import { SearchMail } from "./ThreadSearch.ts";
import { QueryThreads, ReadThread } from "./Threads.ts";

export * from "./Accounts.ts";
export * from "./Addresses.ts";
export * from "./Errors.ts";
export * from "./Ids.ts";
export * from "./Mailboxes.ts";
export * from "./Messages.ts";
export * from "./Pagination.ts";
export * from "./ThreadScope.ts";
export * from "./ThreadSearch.ts";
export * from "./Threads.ts";

export const MailRpcs = RpcGroup.make(
  ListAccounts,
  ListMailboxes,
  QueryThreads,
  ReadThread,
  SearchMail,
);
