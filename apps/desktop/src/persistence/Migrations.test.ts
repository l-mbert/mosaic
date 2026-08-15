import { NodeServices } from "@effect/platform-node";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { makeSqliteLayer, SqliteMemory } from "./Layers/Sqlite.ts";
import { runMigrations } from "./Migrations.ts";
import { ReadSqlClient } from "./Services/Database.ts";

const MigrationTestLive = SqliteClient.layer({ filename: ":memory:" });

describe("SQLite migrations", () => {
  it.effect("creates the current schema", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const objects = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN (
          'accounts',
          'messages',
          'message_search',
          'message_fts',
          'message_search_fts_update',
          'thread_summaries',
          'messages_account_consistency_insert',
          'effect_sql_migrations'
        )
        ORDER BY name
      `;
      const foreignKeys = yield* sql<{ readonly foreign_keys: number }>`
        PRAGMA foreign_keys
      `;

      assert.deepStrictEqual(
        objects.map(({ name }) => name),
        [
          "accounts",
          "effect_sql_migrations",
          "message_fts",
          "message_search",
          "message_search_fts_update",
          "messages",
          "messages_account_consistency_insert",
          "thread_summaries",
        ],
      );
      assert.strictEqual(foreignKeys[0]?.foreign_keys, 1);
    }).pipe(Effect.provide(SqliteMemory)),
  );

  it.effect("upgrades existing mail through each migration", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`PRAGMA foreign_keys = ON`;
      yield* runMigrations({ toMigrationInclusive: 1 });

      yield* sql`
        INSERT INTO accounts (
          id, provider_kind, provider_account_id, display_name, email_address, created_at, updated_at
        ) VALUES
          ('account-a', 'gmail', 'provider-a', 'Account A', 'a@example.test', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
          ('account-b', 'imap', 'provider-b', 'Account B', 'b@example.test', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      `;
      yield* sql`
        INSERT INTO threads (
          id, account_id, provider_thread_id, threading_kind, subject, created_at, updated_at
        ) VALUES ('thread-a', 'account-a', 'provider-thread-a', 'provider', 'Hello', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      `;
      yield* sql`
        INSERT INTO mailboxes (
          id, account_id, provider_mailbox_id, name, kind, role, parent_id
        ) VALUES
          ('mailbox-a', 'account-a', 'provider-mailbox-a', 'Inbox', 'label', 'inbox', NULL),
          ('mailbox-b', 'account-b', 'provider-mailbox-b', 'Inbox', 'folder', 'inbox', NULL)
      `;
      yield* sql`
        INSERT INTO messages (
          id, account_id, thread_id, provider_message_id, internet_message_id, in_reply_to,
          subject, sent_at, received_at, preview, text_body, html_body, is_read, is_starred,
          is_important, is_draft, raw_message_blob_hash
        ) VALUES (
          'message-a', 'account-a', 'thread-a', 'provider-message-a', NULL, NULL,
          'Hello', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'Preview', 'Body', NULL, 0, 0, 0, 0, NULL
        )
      `;

      yield* runMigrations({ toMigrationInclusive: 2 });
      const summaries = yield* sql<{ readonly id: string; readonly messageCount: number }>`
        SELECT id, message_count AS "messageCount"
        FROM thread_summaries
      `;
      assert.deepStrictEqual(summaries, [{ id: "thread-a", messageCount: 1 }]);

      yield* runMigrations({ toMigrationInclusive: 3 });

      const mismatchedMessage = yield* Effect.exit(sql`
        INSERT INTO messages (
          id, account_id, thread_id, provider_message_id, internet_message_id, in_reply_to,
          subject, sent_at, received_at, preview, text_body, html_body, is_read, is_starred,
          is_important, is_draft, raw_message_blob_hash
        ) VALUES (
          'message-bad', 'account-b', 'thread-a', 'provider-message-bad', NULL, NULL,
          'Wrong account', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'Preview', 'Body', NULL, 0, 0, 0, 0, NULL
        )
      `);
      assert(Exit.isFailure(mismatchedMessage));

      const mismatchedMembership = yield* Effect.exit(sql`
        INSERT INTO message_mailboxes (message_id, mailbox_id)
        VALUES ('message-a', 'mailbox-b')
      `);
      assert(Exit.isFailure(mismatchedMembership));

      const reassignedThread = yield* Effect.exit(sql`
        UPDATE threads SET account_id = 'account-b' WHERE id = 'thread-a'
      `);
      assert(Exit.isFailure(reassignedThread));

      const mismatchedParent = yield* Effect.exit(sql`
        INSERT INTO mailboxes (
          id, account_id, provider_mailbox_id, name, kind, role, parent_id
        ) VALUES (
          'mailbox-child-bad', 'account-a', 'provider-mailbox-child-bad',
          'Child', 'folder', NULL, 'mailbox-b'
        )
      `);
      assert(Exit.isFailure(mismatchedParent));

      yield* runMigrations({ toMigrationInclusive: 4 });
      yield* sql`
        INSERT INTO threads (
          id, account_id, provider_thread_id, threading_kind, subject, created_at, updated_at
        ) VALUES (
          'thread-b', 'account-b', 'provider-thread-b', 'provider', 'Moved',
          '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
        )
      `;
      yield* sql`
        INSERT INTO message_mailboxes (message_id, mailbox_id)
        VALUES ('message-a', 'mailbox-a')
      `;

      const reassignedMessage = yield* Effect.exit(sql`
        UPDATE messages
        SET account_id = 'account-b', thread_id = 'thread-b'
        WHERE id = 'message-a'
      `);
      assert(Exit.isFailure(reassignedMessage));

      yield* runMigrations({ toMigrationInclusive: 5 });
      const searchRows = yield* sql<{ readonly messageId: string; readonly body: string }>`
        SELECT message_id AS "messageId", body
        FROM message_search
      `;
      assert.deepStrictEqual(searchRows, [{ messageId: "message-a", body: "Body" }]);

      yield* runMigrations({ toMigrationInclusive: 6 });
      yield* runMigrations({ toMigrationInclusive: 7 });
      yield* runMigrations({ toMigrationInclusive: 8 });
    }).pipe(Effect.provide(MigrationTestLive)),
  );

  it.effect("refuses to bless existing cross-account corruption", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 2 });

      yield* sql`
        INSERT INTO accounts (
          id, provider_kind, provider_account_id, display_name, email_address, created_at, updated_at
        ) VALUES
          ('account-a', 'gmail', 'provider-a', 'Account A', 'a@example.test', '2026-01-01', '2026-01-01'),
          ('account-b', 'imap', 'provider-b', 'Account B', 'b@example.test', '2026-01-01', '2026-01-01')
      `;
      yield* sql`
        INSERT INTO threads (
          id, account_id, provider_thread_id, threading_kind, subject, created_at, updated_at
        ) VALUES ('thread-a', 'account-a', 'provider-thread-a', 'provider', 'Hello', '2026-01-01', '2026-01-01')
      `;
      yield* sql`
        INSERT INTO messages (
          id, account_id, thread_id, provider_message_id, internet_message_id, in_reply_to,
          subject, sent_at, received_at, preview, text_body, html_body, is_read, is_starred,
          is_important, is_draft, raw_message_blob_hash
        ) VALUES (
          'message-bad', 'account-b', 'thread-a', 'provider-message-bad', NULL, NULL,
          'Wrong account', '2026-01-01', '2026-01-01', 'Preview', 'Body', NULL, 0, 0, 0, 0, NULL
        )
      `;

      const migration = yield* Effect.exit(runMigrations({ toMigrationInclusive: 3 }));
      assert(Exit.isFailure(migration));

      const rows = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count FROM effect_sql_migrations
      `;
      assert.strictEqual(rows[0]?.count, 2);

      const triggers = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type = 'trigger' AND name = 'messages_account_consistency_insert'
      `;
      assert.strictEqual(triggers[0]?.count, 0);
    }).pipe(Effect.provide(MigrationTestLive)),
  );
});

it.layer(NodeServices.layer)("file-backed SQLite migrations", (it) => {
  it.effect("reopens a migrated database without rerunning completed migrations", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "mosaic-storage-test-",
      });
      const filename = path.join(directory, "mail.sqlite");

      const readMigrationCount = Effect.gen(function* () {
        const sql = yield* ReadSqlClient;
        const rows = yield* sql<{ readonly count: number }>`
          SELECT COUNT(*) AS count FROM effect_sql_migrations
        `;
        return rows[0]?.count;
      });

      const firstCount = yield* readMigrationCount.pipe(
        Effect.provide(makeSqliteLayer({ filename })),
      );
      const reopenedCount = yield* readMigrationCount.pipe(
        Effect.provide(makeSqliteLayer({ filename })),
      );

      assert.strictEqual(firstCount, 8);
      assert.strictEqual(reopenedCount, 8);
    }),
  );
});
