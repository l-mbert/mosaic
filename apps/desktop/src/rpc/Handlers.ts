import { BackendRpcs } from "@mosaic/contracts/backend";

import { ListAccounts } from "./Handlers/Accounts.ts";
import { Health } from "./Handlers/Health.ts";
import { ListMailboxes } from "./Handlers/Mailboxes.ts";
import { SearchMail } from "./Handlers/Search.ts";
import { QueryThreads, ReadThread } from "./Handlers/Threads.ts";

export const layer = BackendRpcs.toLayer({
  Health,
  ListAccounts,
  ListMailboxes,
  QueryThreads,
  ReadThread,
  SearchMail,
});
