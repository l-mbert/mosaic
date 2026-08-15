import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type * as SqlConnection from "effect/unstable/sql/SqlConnection";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { MailFixture, mailFixture } from "./Fixtures.ts";
import { toSearchableText } from "./SearchText.ts";

export const SeedResult = Schema.TaggedStruct("SeedResult", {
  status: Schema.Literals(["seeded", "already-populated"]),
  accountCount: Schema.Int,
  threadCount: Schema.Int,
  messageCount: Schema.Int,
});
export type SeedResult = typeof SeedResult.Type;

const CountRow = Schema.Struct({ count: Schema.Number });
const SQLITE_BIND_LIMIT = 999;

export const seedMailFixture = Effect.fn("Mail.seedMailFixture")(function* (
  fixture: MailFixture = mailFixture,
) {
  const sql = yield* SqlClient.SqlClient;
  const getAccountCount = SqlSchema.findOne({
    Request: Schema.Void,
    Result: CountRow,
    execute: () => sql`SELECT COUNT(*) AS count FROM accounts`,
  });
  const insertRows = Effect.fnUntraced(function* <Row extends SqlConnection.Row>(
    table: string,
    rows: ReadonlyArray<Row>,
  ) {
    const firstRow = rows[0];
    if (firstRow === undefined) return;

    const rowsPerInsert = Math.max(1, Math.floor(SQLITE_BIND_LIMIT / Object.keys(firstRow).length));
    for (let offset = 0; offset < rows.length; offset += rowsPerInsert) {
      yield* sql`
        INSERT INTO ${sql(table)} ${sql.insert(rows.slice(offset, offset + rowsPerInsert))}
      `;
    }
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

      const encodedFixture = yield* Schema.encodeEffect(MailFixture)(fixture);
      const messageRows = encodedFixture.messages.map((message) => ({
        id: message.id,
        accountId: message.accountId,
        threadId: message.threadId,
        providerMessageId: message.providerMessageId,
        internetMessageId: message.internetMessageId,
        inReplyTo: message.inReplyTo,
        subject: message.subject,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt,
        preview: message.preview,
        textBody: message.body.text,
        htmlBody: message.body.html,
        isRead: Number(message.isRead),
        isStarred: Number(message.isStarred),
        isImportant: Number(message.isImportant),
        isDraft: Number(message.isDraft),
        rawMessageBlobHash: message.rawMessageBlobHash,
        searchBody: toSearchableText(message.body),
      }));
      const referenceRows = encodedFixture.messages.flatMap((message) =>
        message.references.map((reference, position) => ({
          messageId: message.id,
          position,
          reference,
        })),
      );
      const addressRows = encodedFixture.messages.flatMap((message) => {
        const addressGroups = [
          ["from", [message.from]],
          ["reply-to", message.replyTo],
          ["to", message.to],
          ["cc", message.cc],
          ["bcc", message.bcc],
        ] as const;

        return addressGroups.flatMap(([role, addresses]) =>
          addresses.map((address, position) => ({
            messageId: message.id,
            role,
            position,
            name: address.name,
            address: address.address,
          })),
        );
      });
      const mailboxRows = encodedFixture.messages.flatMap((message) =>
        message.mailboxIds.map((mailboxId) => ({ messageId: message.id, mailboxId })),
      );
      const attachmentRows = encodedFixture.messages.flatMap((message) => message.attachments);

      yield* insertRows("accounts", encodedFixture.accounts);
      yield* insertRows("mailboxes", encodedFixture.mailboxes);
      yield* insertRows("threads", encodedFixture.threads);
      yield* insertRows("messages", messageRows);
      yield* insertRows("messageReferences", referenceRows);
      yield* insertRows("messageAddresses", addressRows);
      yield* insertRows("messageMailboxes", mailboxRows);
      yield* insertRows("attachments", attachmentRows);

      return SeedResult.make({
        status: "seeded",
        accountCount: fixture.accounts.length,
        threadCount: fixture.threads.length,
        messageCount: fixture.messages.length,
      });
    }),
  );
});
