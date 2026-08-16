import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { ListAccounts } from "./Accounts.ts";
import { ListMailboxes } from "./Mailboxes.ts";
import { SearchThreads } from "./ThreadSearch.ts";
import { QueryThreads, ReadThread } from "./Threads.ts";

export const Rpcs = RpcGroup.make(
  ListAccounts,
  ListMailboxes,
  QueryThreads,
  ReadThread,
  SearchThreads,
);
