import { AccountSummary, UtcTimestamp } from "@mosaic/contracts/backend/mail";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { MailRepositoryError } from "../Errors.ts";

export const StoredAccount = Schema.Struct({
  ...AccountSummary.fields,
  providerAccountId: Schema.NonEmptyString,
  createdAt: UtcTimestamp,
  updatedAt: UtcTimestamp,
});
export type StoredAccount = typeof StoredAccount.Type;

export interface AccountRepositoryService {
  readonly list: Effect.Effect<ReadonlyArray<StoredAccount>, MailRepositoryError>;
}

export class AccountRepository extends Context.Service<
  AccountRepository,
  AccountRepositoryService
>()("mosaic/desktop/persistence/Services/Accounts/AccountRepository") {}
