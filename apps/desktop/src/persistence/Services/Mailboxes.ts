import { AccountId, MailboxSummary } from "@mosaic/contracts/backend/mail";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { MailRepositoryError } from "../Errors.ts";

export const StoredMailbox = Schema.Struct({
  ...MailboxSummary.fields,
  providerMailboxId: Schema.NonEmptyString,
});
export type StoredMailbox = typeof StoredMailbox.Type;

export interface MailboxRepositoryService {
  readonly list: (
    accountId: AccountId | null,
  ) => Effect.Effect<ReadonlyArray<StoredMailbox>, MailRepositoryError>;
}

export class MailboxRepository extends Context.Service<
  MailboxRepository,
  MailboxRepositoryService
>()("mosaic/desktop/persistence/Services/Mailboxes/MailboxRepository") {}
