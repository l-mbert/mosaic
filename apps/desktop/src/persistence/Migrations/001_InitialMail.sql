CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('gmail', 'microsoft-graph', 'imap')),
  provider_account_id TEXT NOT NULL,
  display_name TEXT,
  email_address TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (provider_kind, provider_account_id)
);

-- statement-breakpoint
CREATE TABLE mailboxes (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_mailbox_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('label', 'folder')),
  role TEXT CHECK (role IS NULL OR role IN ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam', 'all')),
  parent_id TEXT REFERENCES mailboxes(id) ON DELETE SET NULL,
  UNIQUE (account_id, provider_mailbox_id)
);

-- statement-breakpoint
CREATE TABLE threads (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_thread_id TEXT,
  threading_kind TEXT NOT NULL CHECK (threading_kind IN ('provider', 'headers', 'singleton')),
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- statement-breakpoint
CREATE UNIQUE INDEX threads_provider_thread
ON threads(account_id, provider_thread_id)
WHERE provider_thread_id IS NOT NULL;

-- statement-breakpoint
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  internet_message_id TEXT,
  in_reply_to TEXT,
  subject TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  preview TEXT NOT NULL,
  text_body TEXT,
  html_body TEXT,
  is_read INTEGER NOT NULL CHECK (is_read IN (0, 1)),
  is_starred INTEGER NOT NULL CHECK (is_starred IN (0, 1)),
  is_important INTEGER NOT NULL CHECK (is_important IN (0, 1)),
  is_draft INTEGER NOT NULL CHECK (is_draft IN (0, 1)),
  raw_message_blob_hash TEXT,
  UNIQUE (account_id, provider_message_id)
);

-- statement-breakpoint
CREATE INDEX messages_thread_received
ON messages(thread_id, received_at, id);

-- statement-breakpoint
CREATE INDEX messages_account_received
ON messages(account_id, received_at DESC, id);

-- statement-breakpoint
CREATE TABLE message_references (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  reference TEXT NOT NULL,
  PRIMARY KEY (message_id, position)
) WITHOUT ROWID;

-- statement-breakpoint
CREATE TABLE message_addresses (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('from', 'reply-to', 'to', 'cc', 'bcc')),
  position INTEGER NOT NULL,
  name TEXT,
  address TEXT NOT NULL,
  PRIMARY KEY (message_id, role, position)
) WITHOUT ROWID;

-- statement-breakpoint
CREATE INDEX message_addresses_address
ON message_addresses(address);

-- statement-breakpoint
CREATE TABLE message_mailboxes (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, mailbox_id)
) WITHOUT ROWID;

-- statement-breakpoint
CREATE INDEX message_mailboxes_mailbox_message
ON message_mailboxes(mailbox_id, message_id);

-- statement-breakpoint
CREATE TABLE attachments (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider_attachment_id TEXT,
  filename TEXT,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  content_id TEXT,
  disposition TEXT NOT NULL CHECK (disposition IN ('attachment', 'inline')),
  blob_hash TEXT
);

-- statement-breakpoint
CREATE INDEX attachments_message
ON attachments(message_id, id);

-- statement-breakpoint
CREATE VIRTUAL TABLE message_fts USING fts5(
  message_id UNINDEXED,
  thread_id UNINDEXED,
  account_id UNINDEXED,
  subject,
  sender,
  recipients,
  body,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3 4'
);
