import * as Schema from "effect/Schema";

import { Address } from "./Addresses.ts";
import { Attachment } from "./Attachments.ts";
import { AccountId, MailboxId, MessageId, ThreadId } from "./Ids.ts";

export const SanitizedHtml = Schema.String.pipe(Schema.brand("SanitizedHtml"));
export type SanitizedHtml = typeof SanitizedHtml.Type;

export const Message = Schema.Struct({
  id: MessageId,
  accountId: AccountId,
  threadId: ThreadId,
  internetMessageId: Schema.NullOr(Schema.String),
  inReplyTo: Schema.NullOr(Schema.String),
  references: Schema.Array(Schema.String),
  subject: Schema.String,
  sentAt: Schema.DateTimeUtcFromString,
  receivedAt: Schema.DateTimeUtcFromString,
  from: Address,
  replyTo: Schema.Array(Address),
  to: Schema.Array(Address),
  cc: Schema.Array(Address),
  bcc: Schema.Array(Address),
  preview: Schema.String,
  body: Schema.Struct({
    text: Schema.NullOr(Schema.String),
    html: Schema.NullOr(SanitizedHtml),
  }),
  isRead: Schema.Boolean,
  isStarred: Schema.Boolean,
  isImportant: Schema.Boolean,
  isDraft: Schema.Boolean,
  mailboxIds: Schema.Array(MailboxId),
  attachments: Schema.Array(Attachment),
});
export type Message = typeof Message.Type;
