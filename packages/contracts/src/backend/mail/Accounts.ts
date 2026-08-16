import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { EmailAddress } from "./Addresses.ts";
import { StorageError } from "./Errors.ts";
import { AccountId } from "./Ids.ts";

export const ProviderKind = Schema.Literals(["gmail", "microsoft-graph", "imap"]);
export type ProviderKind = typeof ProviderKind.Type;

export const AccountSummary = Schema.Struct({
  id: AccountId,
  providerKind: ProviderKind,
  displayName: Schema.NullOr(Schema.String),
  emailAddress: EmailAddress,
});
export type AccountSummary = typeof AccountSummary.Type;

export const ListAccounts = Rpc.make("ListAccounts", {
  payload: {},
  success: Schema.Array(AccountSummary),
  error: StorageError,
});
