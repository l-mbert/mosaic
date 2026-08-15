import * as Schema from "effect/Schema";

export const MAX_MAIL_ID_LENGTH = 512;

const MailId = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_MAIL_ID_LENGTH));

export const AccountId = MailId.pipe(Schema.brand("AccountId"));
export type AccountId = typeof AccountId.Type;

export const MailboxId = MailId.pipe(Schema.brand("MailboxId"));
export type MailboxId = typeof MailboxId.Type;

export const ThreadId = MailId.pipe(Schema.brand("ThreadId"));
export type ThreadId = typeof ThreadId.Type;

export const MessageId = MailId.pipe(Schema.brand("MessageId"));
export type MessageId = typeof MessageId.Type;

export const AttachmentId = MailId.pipe(Schema.brand("AttachmentId"));
export type AttachmentId = typeof AttachmentId.Type;
