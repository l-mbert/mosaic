import * as Schema from "effect/Schema";

import { MailAddress } from "./Addresses.ts";
import { AccountId, AttachmentId, MailboxId, MessageId, ThreadId } from "./Ids.ts";
import { UtcTimestamp } from "./Timestamps.ts";

export const SanitizedHtml = Schema.String.pipe(Schema.brand("SanitizedHtml"));
export type SanitizedHtml = typeof SanitizedHtml.Type;

export const AttachmentDisposition = Schema.Literals(["attachment", "inline"]);
export type AttachmentDisposition = typeof AttachmentDisposition.Type;

export const Attachment = Schema.Struct({
  id: AttachmentId,
  messageId: MessageId,
  filename: Schema.NullOr(Schema.String),
  mediaType: Schema.NonEmptyString,
  sizeBytes: Schema.Natural,
  contentId: Schema.NullOr(Schema.String),
  disposition: AttachmentDisposition,
});
export type Attachment = typeof Attachment.Type;

export const MailMessage = Schema.Struct({
  id: MessageId,
  accountId: AccountId,
  threadId: ThreadId,
  internetMessageId: Schema.NullOr(Schema.String),
  inReplyTo: Schema.NullOr(Schema.String),
  references: Schema.Array(Schema.String),
  subject: Schema.String,
  sentAt: UtcTimestamp,
  receivedAt: UtcTimestamp,
  from: MailAddress,
  replyTo: Schema.Array(MailAddress),
  to: Schema.Array(MailAddress),
  cc: Schema.Array(MailAddress),
  bcc: Schema.Array(MailAddress),
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
export type MailMessage = typeof MailMessage.Type;
