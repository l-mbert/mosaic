import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { EmailAddress } from "./Addresses.ts";
import { StorageError } from "./Errors.ts";
import { AccountId } from "./Ids.ts";

export const ProviderDriverKind = Schema.NonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
);
export type ProviderDriverKind = typeof ProviderDriverKind.Type;

export const AccountSummary = Schema.Struct({
  id: AccountId,
  providerKind: ProviderDriverKind,
  displayName: Schema.NullOr(Schema.String),
  emailAddress: EmailAddress,
});
export type AccountSummary = typeof AccountSummary.Type;

export const ListAccounts = Rpc.make("ListAccounts", {
  payload: {},
  success: Schema.Array(AccountSummary),
  error: StorageError,
});
