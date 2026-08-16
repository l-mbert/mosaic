import * as Schema from "effect/Schema";

export const MAX_ID_LENGTH = 512;

const Id = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_ID_LENGTH));

export const AccountId = Id.pipe(Schema.brand("AccountId"));
export type AccountId = typeof AccountId.Type;

export const MailboxId = Id.pipe(Schema.brand("MailboxId"));
export type MailboxId = typeof MailboxId.Type;

export const ThreadId = Id.pipe(Schema.brand("ThreadId"));
export type ThreadId = typeof ThreadId.Type;

export const MessageId = Id.pipe(Schema.brand("MessageId"));
export type MessageId = typeof MessageId.Type;

export const AttachmentId = Id.pipe(Schema.brand("AttachmentId"));
export type AttachmentId = typeof AttachmentId.Type;
