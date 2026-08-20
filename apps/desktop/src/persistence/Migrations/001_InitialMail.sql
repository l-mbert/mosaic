CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 512),
  provider_kind TEXT NOT NULL CHECK (
    length(provider_kind) BETWEEN 1 AND 64
    AND provider_kind NOT GLOB '*[^a-z0-9-]*'
    AND substr(provider_kind, 1, 1) GLOB '[a-z0-9]'
    AND substr(provider_kind, -1, 1) GLOB '[a-z0-9]'
  ),
  provider_account_id TEXT NOT NULL CHECK (length(provider_account_id) > 0),
  display_name TEXT,
  email_address TEXT NOT NULL CHECK (
    length(trim(email_address)) > 0
    AND email_address = trim(email_address)
  ),
  created_at TEXT NOT NULL CHECK (
    length(created_at) = 24
    AND substr(created_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at
  ),
  updated_at TEXT NOT NULL CHECK (
    length(updated_at) = 24
    AND substr(updated_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at
  ),
  UNIQUE (provider_kind, provider_account_id)
) STRICT;

-- statement-breakpoint
CREATE TABLE mailboxes (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 512),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_mailbox_id TEXT NOT NULL CHECK (length(provider_mailbox_id) > 0),
  name TEXT NOT NULL CHECK (length(name) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('label', 'folder')),
  role TEXT CHECK (role IS NULL OR role IN ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam', 'all')),
  parent_id TEXT REFERENCES mailboxes(id) ON DELETE SET NULL CHECK (
    parent_id IS NULL OR length(parent_id) > 0
  ),
  UNIQUE (account_id, provider_mailbox_id)
) STRICT;

-- statement-breakpoint
CREATE INDEX mailboxes_account_name
ON mailboxes(account_id, name COLLATE NOCASE, id);

-- statement-breakpoint
CREATE INDEX mailboxes_parent
ON mailboxes(parent_id)
WHERE parent_id IS NOT NULL;

-- statement-breakpoint
CREATE TABLE threads (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 512),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_thread_id TEXT CHECK (
    provider_thread_id IS NULL OR length(provider_thread_id) > 0
  ),
  threading_kind TEXT NOT NULL CHECK (threading_kind IN ('provider', 'headers', 'singleton')),
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL CHECK (
    length(created_at) = 24
    AND substr(created_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at
  ),
  updated_at TEXT NOT NULL CHECK (
    length(updated_at) = 24
    AND substr(updated_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at
  ),
  UNIQUE (account_id, id)
) STRICT;

-- statement-breakpoint
CREATE UNIQUE INDEX threads_provider_thread
ON threads(account_id, provider_thread_id)
WHERE provider_thread_id IS NOT NULL;

-- statement-breakpoint
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 512),
  account_id TEXT NOT NULL,
  thread_id TEXT NOT NULL CHECK (length(thread_id) > 0),
  provider_message_id TEXT NOT NULL CHECK (length(provider_message_id) > 0),
  internet_message_id TEXT,
  in_reply_to TEXT,
  subject TEXT NOT NULL,
  sent_at TEXT NOT NULL CHECK (
    length(sent_at) = 24
    AND substr(sent_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', sent_at) IS sent_at
  ),
  received_at TEXT NOT NULL CHECK (
    length(received_at) = 24
    AND substr(received_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', received_at) IS received_at
  ),
  preview TEXT NOT NULL,
  text_body TEXT,
  html_body TEXT,
  is_read INTEGER NOT NULL CHECK (is_read IN (0, 1)),
  is_starred INTEGER NOT NULL CHECK (is_starred IN (0, 1)),
  is_important INTEGER NOT NULL CHECK (is_important IN (0, 1)),
  is_draft INTEGER NOT NULL CHECK (is_draft IN (0, 1)),
  raw_message_blob_hash TEXT CHECK (
    raw_message_blob_hash IS NULL OR length(raw_message_blob_hash) > 0
  ),
  search_body TEXT NOT NULL DEFAULT '',
  UNIQUE (account_id, provider_message_id),
  FOREIGN KEY (account_id, thread_id) REFERENCES threads(account_id, id) ON DELETE CASCADE
) STRICT;

-- statement-breakpoint
CREATE INDEX messages_thread_received
ON messages(thread_id, received_at, id);

-- statement-breakpoint
CREATE INDEX messages_account_received
ON messages(account_id, received_at DESC, id);

-- statement-breakpoint
CREATE INDEX messages_account_unread_received
ON messages(account_id, received_at DESC, id)
WHERE is_read = 0;

-- statement-breakpoint
CREATE INDEX messages_account_starred_received
ON messages(account_id, received_at DESC, id)
WHERE is_starred = 1;

-- statement-breakpoint
CREATE TABLE message_references (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  reference TEXT NOT NULL CHECK (length(reference) > 0),
  PRIMARY KEY (message_id, position)
) STRICT, WITHOUT ROWID;

-- statement-breakpoint
CREATE TABLE message_addresses (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('from', 'reply-to', 'to', 'cc', 'bcc')),
  position INTEGER NOT NULL CHECK (position >= 0),
  name TEXT,
  address TEXT NOT NULL CHECK (
    length(trim(address)) > 0
    AND address = trim(address)
  ),
  normalized_address TEXT GENERATED ALWAYS AS (lower(address)) STORED,
  PRIMARY KEY (message_id, role, position)
) STRICT, WITHOUT ROWID;

-- statement-breakpoint
CREATE INDEX message_addresses_role_normalized
ON message_addresses(role, normalized_address, message_id);

-- statement-breakpoint
CREATE UNIQUE INDEX message_addresses_one_from
ON message_addresses(message_id)
WHERE role = 'from';

-- statement-breakpoint
CREATE TABLE message_mailboxes (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, mailbox_id)
) STRICT, WITHOUT ROWID;

-- statement-breakpoint
CREATE INDEX message_mailboxes_mailbox_message
ON message_mailboxes(mailbox_id, message_id);

-- statement-breakpoint
CREATE TABLE attachments (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 512),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider_attachment_id TEXT CHECK (
    provider_attachment_id IS NULL OR length(provider_attachment_id) > 0
  ),
  filename TEXT,
  media_type TEXT NOT NULL CHECK (length(media_type) > 0),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 0 AND 9007199254740991),
  content_id TEXT,
  disposition TEXT NOT NULL CHECK (disposition IN ('attachment', 'inline')),
  blob_hash TEXT CHECK (blob_hash IS NULL OR length(blob_hash) > 0)
) STRICT;

-- statement-breakpoint
CREATE INDEX attachments_message
ON attachments(message_id, id);

-- statement-breakpoint
CREATE TABLE thread_summaries (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  message_count INTEGER NOT NULL CHECK (message_count > 0),
  unread_count INTEGER NOT NULL CHECK (unread_count BETWEEN 0 AND message_count),
  has_attachments INTEGER NOT NULL CHECK (has_attachments IN (0, 1)),
  FOREIGN KEY (account_id, id) REFERENCES threads(account_id, id) ON DELETE CASCADE
) STRICT;

-- statement-breakpoint
CREATE INDEX thread_summaries_last_message
ON thread_summaries(last_message_at DESC, id);

-- statement-breakpoint
CREATE INDEX thread_summaries_account_last_message
ON thread_summaries(account_id, last_message_at DESC, id);

-- statement-breakpoint
CREATE VIEW thread_summary_source AS
SELECT
  threads.id,
  threads.account_id,
  threads.subject,
  latest.preview,
  latest.received_at AS last_message_at,
  (
    SELECT COUNT(*)
    FROM messages count_messages
    WHERE count_messages.thread_id = threads.id
  ) AS message_count,
  (
    SELECT COUNT(*)
    FROM messages unread_messages
    WHERE unread_messages.thread_id = threads.id
      AND unread_messages.is_read = 0
  ) AS unread_count,
  EXISTS(
    SELECT 1
    FROM messages attachment_messages
    JOIN attachments ON attachments.message_id = attachment_messages.id
    WHERE attachment_messages.thread_id = threads.id
  ) AS has_attachments
FROM threads
JOIN messages latest ON latest.id = (
  SELECT latest_message.id
  FROM messages latest_message
  WHERE latest_message.thread_id = threads.id
  ORDER BY latest_message.received_at DESC, latest_message.id DESC
  LIMIT 1
);

-- statement-breakpoint
CREATE TABLE message_search (
  id INTEGER PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  account_key TEXT NOT NULL CHECK (length(account_key) > 0),
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  to_recipients TEXT NOT NULL,
  cc_recipients TEXT NOT NULL,
  bcc_recipients TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- statement-breakpoint
CREATE VIEW message_search_addresses AS
SELECT
  messages.id AS message_id,
  COALESCE((
    SELECT group_concat(formatted_address, ' ')
    FROM (
      SELECT trim(COALESCE(addresses.name || ' ', '') || addresses.address) AS formatted_address
      FROM message_addresses addresses
      WHERE addresses.message_id = messages.id
        AND addresses.role = 'from'
      ORDER BY addresses.position
    )
  ), '') AS sender,
  COALESCE((
    SELECT group_concat(formatted_address, ' ')
    FROM (
      SELECT trim(COALESCE(addresses.name || ' ', '') || addresses.address) AS formatted_address
      FROM message_addresses addresses
      WHERE addresses.message_id = messages.id
        AND addresses.role = 'to'
      ORDER BY addresses.position
    )
  ), '') AS to_recipients,
  COALESCE((
    SELECT group_concat(formatted_address, ' ')
    FROM (
      SELECT trim(COALESCE(addresses.name || ' ', '') || addresses.address) AS formatted_address
      FROM message_addresses addresses
      WHERE addresses.message_id = messages.id
        AND addresses.role = 'cc'
      ORDER BY addresses.position
    )
  ), '') AS cc_recipients,
  COALESCE((
    SELECT group_concat(formatted_address, ' ')
    FROM (
      SELECT trim(COALESCE(addresses.name || ' ', '') || addresses.address) AS formatted_address
      FROM message_addresses addresses
      WHERE addresses.message_id = messages.id
        AND addresses.role = 'bcc'
      ORDER BY addresses.position
    )
  ), '') AS bcc_recipients
FROM messages;

-- statement-breakpoint
CREATE VIRTUAL TABLE message_fts USING fts5(
  account_key,
  subject,
  sender,
  to_recipients,
  cc_recipients,
  bcc_recipients,
  body,
  content = 'message_search',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3 4'
);

-- statement-breakpoint
CREATE TRIGGER mailboxes_account_consistency_insert
BEFORE INSERT ON mailboxes
WHEN NEW.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM mailboxes parent
    WHERE parent.id = NEW.parent_id
      AND parent.account_id = NEW.account_id
  )
BEGIN
  SELECT RAISE(ABORT, 'mailbox and parent must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER mailboxes_account_consistency_update
BEFORE UPDATE OF account_id, parent_id ON mailboxes
WHEN (
  NEW.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM mailboxes parent
    WHERE parent.id = NEW.parent_id
      AND parent.account_id = NEW.account_id
  )
)
OR (
  NEW.parent_id IS NOT NULL
  AND EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT NEW.parent_id
      UNION
      SELECT parent.parent_id
      FROM mailboxes parent
      JOIN ancestors ON parent.id = ancestors.id
      WHERE parent.parent_id IS NOT NULL
    )
    SELECT 1 FROM ancestors WHERE id = OLD.id
  )
)
OR EXISTS (
  SELECT 1
  FROM mailboxes child
  WHERE child.parent_id = OLD.id
    AND child.account_id <> NEW.account_id
)
OR EXISTS (
  SELECT 1
  FROM message_mailboxes membership
  JOIN messages ON messages.id = membership.message_id
  WHERE membership.mailbox_id = OLD.id
    AND messages.account_id <> NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'mailbox relationships must stay within one account and remain acyclic');
END;

-- statement-breakpoint
CREATE TRIGGER messages_mailbox_consistency_update
BEFORE UPDATE OF account_id ON messages
WHEN EXISTS (
  SELECT 1
  FROM message_mailboxes membership
  JOIN mailboxes ON mailboxes.id = membership.mailbox_id
  WHERE membership.message_id = OLD.id
    AND mailboxes.account_id <> NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message and mailbox must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER message_mailboxes_account_consistency_insert
BEFORE INSERT ON message_mailboxes
WHEN NOT EXISTS (
  SELECT 1
  FROM messages
  JOIN mailboxes ON mailboxes.id = NEW.mailbox_id
  WHERE messages.id = NEW.message_id
    AND messages.account_id = mailboxes.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message and mailbox must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER message_mailboxes_account_consistency_update
BEFORE UPDATE OF message_id, mailbox_id ON message_mailboxes
WHEN NOT EXISTS (
  SELECT 1
  FROM messages
  JOIN mailboxes ON mailboxes.id = NEW.mailbox_id
  WHERE messages.id = NEW.message_id
    AND messages.account_id = mailboxes.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message and mailbox must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_messages_insert
AFTER INSERT ON messages
BEGIN
  DELETE FROM thread_summaries WHERE id = NEW.thread_id;
  INSERT INTO thread_summaries
  SELECT * FROM thread_summary_source WHERE id = NEW.thread_id;
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_messages_delete
AFTER DELETE ON messages
BEGIN
  DELETE FROM thread_summaries WHERE id = OLD.thread_id;
  INSERT INTO thread_summaries
  SELECT * FROM thread_summary_source WHERE id = OLD.thread_id;
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_messages_update
AFTER UPDATE OF account_id, thread_id, received_at, preview, is_read ON messages
BEGIN
  DELETE FROM thread_summaries WHERE id IN (OLD.thread_id, NEW.thread_id);
  INSERT INTO thread_summaries
  SELECT * FROM thread_summary_source WHERE id IN (OLD.thread_id, NEW.thread_id);
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_threads_update
AFTER UPDATE OF subject ON threads
BEGIN
  UPDATE thread_summaries SET subject = NEW.subject WHERE id = NEW.id;
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_attachments_insert
AFTER INSERT ON attachments
BEGIN
  UPDATE thread_summaries
  SET has_attachments = 1
  WHERE id = (SELECT thread_id FROM messages WHERE id = NEW.message_id);
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_attachments_delete
AFTER DELETE ON attachments
BEGIN
  UPDATE thread_summaries
  SET has_attachments = EXISTS(
    SELECT 1
    FROM messages
    JOIN attachments remaining ON remaining.message_id = messages.id
    WHERE messages.thread_id = thread_summaries.id
  )
  WHERE id = (SELECT thread_id FROM messages WHERE id = OLD.message_id);
END;

-- statement-breakpoint
CREATE TRIGGER thread_summaries_attachments_update
AFTER UPDATE OF message_id ON attachments
BEGIN
  DELETE FROM thread_summaries
  WHERE id IN (
    SELECT thread_id FROM messages WHERE id IN (OLD.message_id, NEW.message_id)
  );
  INSERT INTO thread_summaries
  SELECT *
  FROM thread_summary_source
  WHERE id IN (
    SELECT thread_id FROM messages WHERE id IN (OLD.message_id, NEW.message_id)
  );
END;

-- statement-breakpoint
CREATE TRIGGER message_search_fts_insert
AFTER INSERT ON message_search
BEGIN
  INSERT INTO message_fts(
    rowid,
    account_key,
    subject,
    sender,
    to_recipients,
    cc_recipients,
    bcc_recipients,
    body
  )
  VALUES (
    NEW.id,
    NEW.account_key,
    NEW.subject,
    NEW.sender,
    NEW.to_recipients,
    NEW.cc_recipients,
    NEW.bcc_recipients,
    NEW.body
  );
END;

-- statement-breakpoint
CREATE TRIGGER message_search_fts_delete
AFTER DELETE ON message_search
BEGIN
  INSERT INTO message_fts(
    message_fts,
    rowid,
    account_key,
    subject,
    sender,
    to_recipients,
    cc_recipients,
    bcc_recipients,
    body
  )
  VALUES (
    'delete',
    OLD.id,
    OLD.account_key,
    OLD.subject,
    OLD.sender,
    OLD.to_recipients,
    OLD.cc_recipients,
    OLD.bcc_recipients,
    OLD.body
  );
END;

-- statement-breakpoint
CREATE TRIGGER message_search_fts_update
AFTER UPDATE ON message_search
BEGIN
  INSERT INTO message_fts(
    message_fts,
    rowid,
    account_key,
    subject,
    sender,
    to_recipients,
    cc_recipients,
    bcc_recipients,
    body
  )
  VALUES (
    'delete',
    OLD.id,
    OLD.account_key,
    OLD.subject,
    OLD.sender,
    OLD.to_recipients,
    OLD.cc_recipients,
    OLD.bcc_recipients,
    OLD.body
  );
  INSERT INTO message_fts(
    rowid,
    account_key,
    subject,
    sender,
    to_recipients,
    cc_recipients,
    bcc_recipients,
    body
  )
  VALUES (
    NEW.id,
    NEW.account_key,
    NEW.subject,
    NEW.sender,
    NEW.to_recipients,
    NEW.cc_recipients,
    NEW.bcc_recipients,
    NEW.body
  );
END;

-- statement-breakpoint
CREATE TRIGGER messages_search_insert
AFTER INSERT ON messages
BEGIN
  INSERT INTO message_search(
    message_id,
    account_key,
    subject,
    sender,
    to_recipients,
    cc_recipients,
    bcc_recipients,
    body
  )
  VALUES (NEW.id, hex(NEW.account_id), NEW.subject, '', '', '', '', NEW.search_body);
END;

-- statement-breakpoint
CREATE TRIGGER messages_search_account_update
AFTER UPDATE OF account_id ON messages
BEGIN
  UPDATE message_search
  SET account_key = hex(NEW.account_id)
  WHERE message_id = OLD.id;
END;

-- statement-breakpoint
CREATE TRIGGER messages_search_subject_update
AFTER UPDATE OF subject ON messages
BEGIN
  UPDATE message_search
  SET subject = NEW.subject
  WHERE message_id = OLD.id;
END;

-- statement-breakpoint
CREATE TRIGGER messages_search_body_update
AFTER UPDATE OF search_body ON messages
BEGIN
  UPDATE message_search
  SET body = NEW.search_body
  WHERE message_id = OLD.id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_insert
AFTER INSERT ON message_addresses
BEGIN
  UPDATE message_search
  SET (sender, to_recipients, cc_recipients, bcc_recipients) = (
    SELECT sender, to_recipients, cc_recipients, bcc_recipients
    FROM message_search_addresses
    WHERE message_id = NEW.message_id
  )
  WHERE message_id = NEW.message_id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_delete
AFTER DELETE ON message_addresses
BEGIN
  UPDATE message_search
  SET (sender, to_recipients, cc_recipients, bcc_recipients) = (
    SELECT sender, to_recipients, cc_recipients, bcc_recipients
    FROM message_search_addresses
    WHERE message_id = OLD.message_id
  )
  WHERE message_id = OLD.message_id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_update
AFTER UPDATE ON message_addresses
BEGIN
  UPDATE message_search
  SET (sender, to_recipients, cc_recipients, bcc_recipients) = (
    SELECT sender, to_recipients, cc_recipients, bcc_recipients
    FROM message_search_addresses
    WHERE message_id = OLD.message_id
  )
  WHERE message_id = OLD.message_id;

  UPDATE message_search
  SET (sender, to_recipients, cc_recipients, bcc_recipients) = (
    SELECT sender, to_recipients, cc_recipients, bcc_recipients
    FROM message_search_addresses
    WHERE message_id = NEW.message_id
  )
  WHERE message_id = NEW.message_id;
END;
