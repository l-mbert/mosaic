import * as Layer from "effect/Layer";

import { AccountRepositoryLive } from "./Layers/Accounts.ts";
import { MailboxRepositoryLive } from "./Layers/Mailboxes.ts";
import { ThreadSearchRepositoryLive } from "./Layers/ThreadSearch.ts";
import { ThreadRepositoryLive } from "./Layers/Threads.ts";

export const layer = Layer.mergeAll(
  AccountRepositoryLive,
  MailboxRepositoryLive,
  ThreadRepositoryLive,
  ThreadSearchRepositoryLive,
);
