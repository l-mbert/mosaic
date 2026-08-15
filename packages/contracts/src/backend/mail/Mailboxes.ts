import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";

import { BackendMailError } from "./Errors.ts";
import { AccountId, MailboxId } from "./Ids.ts";

export const MailboxKind = Schema.Literals(["label", "folder"]);
export type MailboxKind = typeof MailboxKind.Type;

export const MailboxRole = Schema.Literals([
  "inbox",
  "sent",
  "drafts",
  "archive",
  "trash",
  "spam",
  "all",
]);
export type MailboxRole = typeof MailboxRole.Type;

export const MailboxSummary = Schema.Struct({
  id: MailboxId,
  accountId: AccountId,
  name: Schema.NonEmptyString,
  kind: MailboxKind,
  role: Schema.NullOr(MailboxRole),
  parentId: Schema.NullOr(MailboxId),
});
export type MailboxSummary = typeof MailboxSummary.Type;

export const ListMailboxes = Rpc.make("ListMailboxes", {
  payload: Schema.Struct({ accountId: Schema.NullOr(AccountId) }),
  success: Schema.Array(MailboxSummary),
  error: BackendMailError,
});
