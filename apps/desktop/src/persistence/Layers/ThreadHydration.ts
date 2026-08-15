import {
  AccountId,
  MailAddress,
  MailboxId,
  MessageId,
  ThreadId,
} from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { MailRepositoryError } from "../Errors.ts";
import {
  StoredAttachment,
  StoredMailMessage,
  StoredThread,
  StoredThreadDetail,
  UntrustedHtml,
} from "../Services/Threads.ts";

export const MessageRow = Schema.Struct({
  id: MessageId,
  accountId: AccountId,
  threadId: ThreadId,
  providerMessageId: Schema.NonEmptyString,
  internetMessageId: Schema.NullOr(Schema.String),
  inReplyTo: Schema.NullOr(Schema.String),
  subject: Schema.String,
  sentAt: Schema.DateTimeUtcFromString,
  receivedAt: Schema.DateTimeUtcFromString,
  preview: Schema.String,
  textBody: Schema.NullOr(Schema.String),
  htmlBody: Schema.NullOr(UntrustedHtml),
  isRead: Schema.BooleanFromBit,
  isStarred: Schema.BooleanFromBit,
  isImportant: Schema.BooleanFromBit,
  isDraft: Schema.BooleanFromBit,
  rawMessageBlobHash: Schema.NullOr(Schema.NonEmptyString),
});

export const ReferenceRow = Schema.Struct({
  messageId: MessageId,
  reference: Schema.String,
});

export const AddressRow = Schema.Struct({
  messageId: MessageId,
  role: Schema.Literals(["from", "reply-to", "to", "cc", "bcc"]),
  name: Schema.NullOr(Schema.String),
  address: MailAddress.fields.address,
});

export const MessageMailboxRow = Schema.Struct({
  messageId: MessageId,
  mailboxId: MailboxId,
});

export const assembleThreadDetail = Effect.fn("ThreadRepository.assembleThreadDetail")(function* (
  thread: StoredThread,
  messageRows: ReadonlyArray<typeof MessageRow.Type>,
  referenceRows: ReadonlyArray<typeof ReferenceRow.Type>,
  addressRows: ReadonlyArray<typeof AddressRow.Type>,
  mailboxRows: ReadonlyArray<typeof MessageMailboxRow.Type>,
  attachmentRows: ReadonlyArray<typeof StoredAttachment.Type>,
) {
  const references = new Map<MessageId, Array<string>>();
  for (const row of referenceRows) {
    const values = references.get(row.messageId) ?? [];
    values.push(row.reference);
    references.set(row.messageId, values);
  }

  const addresses = new Map<
    MessageId,
    Record<"from" | "reply-to" | "to" | "cc" | "bcc", Array<MailAddress>>
  >();
  for (const row of addressRows) {
    const values = addresses.get(row.messageId) ?? {
      from: [],
      "reply-to": [],
      to: [],
      cc: [],
      bcc: [],
    };
    values[row.role].push(MailAddress.make({ name: row.name, address: row.address }));
    addresses.set(row.messageId, values);
  }

  const mailboxIds = new Map<MessageId, Array<MailboxId>>();
  for (const row of mailboxRows) {
    const values = mailboxIds.get(row.messageId) ?? [];
    values.push(row.mailboxId);
    mailboxIds.set(row.messageId, values);
  }

  const attachments = new Map<MessageId, Array<typeof StoredAttachment.Type>>();
  for (const attachment of attachmentRows) {
    const values = attachments.get(attachment.messageId) ?? [];
    values.push(attachment);
    attachments.set(attachment.messageId, values);
  }

  const messages: Array<typeof StoredMailMessage.Type> = [];
  for (const row of messageRows) {
    const messageAddresses = addresses.get(row.id);
    if (messageAddresses === undefined || messageAddresses.from[0] === undefined) {
      return yield* new MailRepositoryError({
        operation: "readThread.fromAddress",
        message: `Message ${row.id} has no from address.`,
      });
    }

    messages.push(
      StoredMailMessage.make({
        id: row.id,
        accountId: row.accountId,
        threadId: row.threadId,
        providerMessageId: row.providerMessageId,
        internetMessageId: row.internetMessageId,
        inReplyTo: row.inReplyTo,
        references: references.get(row.id) ?? [],
        subject: row.subject,
        sentAt: row.sentAt,
        receivedAt: row.receivedAt,
        from: messageAddresses.from[0],
        replyTo: messageAddresses["reply-to"],
        to: messageAddresses.to,
        cc: messageAddresses.cc,
        bcc: messageAddresses.bcc,
        preview: row.preview,
        body: { text: row.textBody, html: row.htmlBody },
        isRead: row.isRead,
        isStarred: row.isStarred,
        isImportant: row.isImportant,
        isDraft: row.isDraft,
        rawMessageBlobHash: row.rawMessageBlobHash,
        mailboxIds: mailboxIds.get(row.id) ?? [],
        attachments: attachments.get(row.id) ?? [],
      }),
    );
  }

  return StoredThreadDetail.make({ thread, messages });
});
