import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { mailFixture, type MailFixture } from "./Fixtures.ts";
import { toSearchableText } from "./SearchText.ts";

export const SeedResult = Schema.TaggedStruct("SeedResult", {
  status: Schema.Literals(["seeded", "already-populated"]),
  accountCount: Schema.Int,
  threadCount: Schema.Int,
  messageCount: Schema.Int,
});
export type SeedResult = typeof SeedResult.Type;

const CountRow = Schema.Struct({ count: Schema.Number });

export const seedMailFixture = Effect.fn("Mail.seedMailFixture")(function* (
  fixture: MailFixture = mailFixture,
) {
  const sql = yield* SqlClient.SqlClient;
  const getAccountCount = SqlSchema.findOne({
    Request: Schema.Void,
    Result: CountRow,
    execute: () => sql`SELECT COUNT(*) AS count FROM accounts`,
  });

  return yield* sql.withTransaction(
    Effect.gen(function* () {
      const { count: accountCount } = yield* getAccountCount(undefined).pipe(
        Effect.catchTag("NoSuchElementError", Effect.die),
      );

      if (accountCount > 0) {
        return SeedResult.make({
          status: "already-populated",
          accountCount,
          threadCount: 0,
          messageCount: 0,
        });
      }

      for (const account of fixture.accounts) {
        yield* sql`
          INSERT INTO accounts (
            id, provider_kind, provider_account_id, display_name, email_address, created_at, updated_at
          ) VALUES (
            ${account.id}, ${account.providerKind}, ${account.providerAccountId},
            ${account.displayName}, ${account.emailAddress}, ${account.createdAt}, ${account.updatedAt}
          )
        `;
      }

      for (const mailbox of fixture.mailboxes) {
        yield* sql`
          INSERT INTO mailboxes (
            id, account_id, provider_mailbox_id, name, kind, role, parent_id
          ) VALUES (
            ${mailbox.id}, ${mailbox.accountId}, ${mailbox.providerMailboxId}, ${mailbox.name},
            ${mailbox.kind}, ${mailbox.role}, ${mailbox.parentId}
          )
        `;
      }

      for (const thread of fixture.threads) {
        yield* sql`
          INSERT INTO threads (
            id, account_id, provider_thread_id, threading_kind, subject, created_at, updated_at
          ) VALUES (
            ${thread.id}, ${thread.accountId}, ${thread.providerThreadId}, ${thread.threadingKind},
            ${thread.subject}, ${thread.createdAt}, ${thread.updatedAt}
          )
        `;
      }

      for (const message of fixture.messages) {
        yield* sql`
          INSERT INTO messages (
            id, account_id, thread_id, provider_message_id, internet_message_id, in_reply_to,
            subject, sent_at, received_at, preview, text_body, html_body, is_read, is_starred,
            is_important, is_draft, raw_message_blob_hash, search_body
          ) VALUES (
            ${message.id}, ${message.accountId}, ${message.threadId}, ${message.providerMessageId},
            ${message.internetMessageId}, ${message.inReplyTo}, ${message.subject}, ${message.sentAt},
            ${message.receivedAt}, ${message.preview}, ${message.body.text}, ${message.body.html},
            ${Number(message.isRead)}, ${Number(message.isStarred)}, ${Number(message.isImportant)},
            ${Number(message.isDraft)}, ${message.rawMessageBlobHash},
            ${toSearchableText(message.body)}
          )
        `;

        for (const [position, reference] of message.references.entries()) {
          yield* sql`
            INSERT INTO message_references (message_id, position, reference)
            VALUES (${message.id}, ${position}, ${reference})
          `;
        }

        const addressGroups = [
          ["from", [message.from]],
          ["reply-to", message.replyTo],
          ["to", message.to],
          ["cc", message.cc],
          ["bcc", message.bcc],
        ] as const;

        for (const [role, addresses] of addressGroups) {
          for (const [position, address] of addresses.entries()) {
            yield* sql`
              INSERT INTO message_addresses (message_id, role, position, name, address)
              VALUES (${message.id}, ${role}, ${position}, ${address.name}, ${address.address})
            `;
          }
        }

        for (const mailboxId of message.mailboxIds) {
          yield* sql`
            INSERT INTO message_mailboxes (message_id, mailbox_id)
            VALUES (${message.id}, ${mailboxId})
          `;
        }

        for (const attachment of message.attachments) {
          yield* sql`
            INSERT INTO attachments (
              id, message_id, provider_attachment_id, filename, media_type, size_bytes,
              content_id, disposition, blob_hash
            ) VALUES (
              ${attachment.id}, ${attachment.messageId}, ${attachment.providerAttachmentId},
              ${attachment.filename}, ${attachment.mediaType}, ${attachment.sizeBytes},
              ${attachment.contentId}, ${attachment.disposition}, ${attachment.blobHash}
            )
          `;
        }
      }

      return SeedResult.make({
        status: "seeded",
        accountCount: fixture.accounts.length,
        threadCount: fixture.threads.length,
        messageCount: fixture.messages.length,
      });
    }),
  );
});
