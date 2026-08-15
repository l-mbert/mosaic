DROP TRIGGER accounts_validate_insert;

-- statement-breakpoint
DROP TRIGGER accounts_validate_update;

-- statement-breakpoint
DROP TRIGGER threads_validate_insert;

-- statement-breakpoint
DROP TRIGGER threads_validate_update;

-- statement-breakpoint
DROP TRIGGER messages_validate_insert;

-- statement-breakpoint
DROP TRIGGER messages_validate_update;

-- statement-breakpoint
DROP TRIGGER attachments_validate_insert;

-- statement-breakpoint
DROP TRIGGER attachments_validate_update;

-- statement-breakpoint
DROP TRIGGER mailboxes_account_consistency_update;

-- statement-breakpoint
CREATE TRIGGER accounts_validate_insert
BEFORE INSERT ON accounts
WHEN length(NEW.id) = 0
  OR length(NEW.provider_account_id) = 0
  OR length(trim(NEW.email_address)) = 0
  OR NEW.email_address <> trim(NEW.email_address)
  OR length(NEW.created_at) <> 24
  OR substr(NEW.created_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
  OR substr(NEW.updated_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
BEGIN
  SELECT RAISE(ABORT, 'invalid stored account');
END;

-- statement-breakpoint
CREATE TRIGGER accounts_validate_update
BEFORE UPDATE ON accounts
WHEN length(NEW.id) = 0
  OR length(NEW.provider_account_id) = 0
  OR length(trim(NEW.email_address)) = 0
  OR NEW.email_address <> trim(NEW.email_address)
  OR length(NEW.created_at) <> 24
  OR substr(NEW.created_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
  OR substr(NEW.updated_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
BEGIN
  SELECT RAISE(ABORT, 'invalid stored account');
END;

-- statement-breakpoint
CREATE TRIGGER threads_validate_insert
BEFORE INSERT ON threads
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR (NEW.provider_thread_id IS NOT NULL AND length(NEW.provider_thread_id) = 0)
  OR length(NEW.created_at) <> 24
  OR substr(NEW.created_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
  OR substr(NEW.updated_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
BEGIN
  SELECT RAISE(ABORT, 'invalid stored thread');
END;

-- statement-breakpoint
CREATE TRIGGER threads_validate_update
BEFORE UPDATE ON threads
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR (NEW.provider_thread_id IS NOT NULL AND length(NEW.provider_thread_id) = 0)
  OR length(NEW.created_at) <> 24
  OR substr(NEW.created_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
  OR substr(NEW.updated_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
BEGIN
  SELECT RAISE(ABORT, 'invalid stored thread');
END;

-- statement-breakpoint
CREATE TRIGGER messages_validate_insert
BEFORE INSERT ON messages
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR length(NEW.thread_id) = 0
  OR length(NEW.provider_message_id) = 0
  OR length(NEW.sent_at) <> 24
  OR substr(NEW.sent_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.sent_at) IS NOT NEW.sent_at
  OR length(NEW.received_at) <> 24
  OR substr(NEW.received_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.received_at) IS NOT NEW.received_at
  OR (NEW.raw_message_blob_hash IS NOT NULL AND length(NEW.raw_message_blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored message');
END;

-- statement-breakpoint
CREATE TRIGGER messages_validate_update
BEFORE UPDATE ON messages
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR length(NEW.thread_id) = 0
  OR length(NEW.provider_message_id) = 0
  OR length(NEW.sent_at) <> 24
  OR substr(NEW.sent_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.sent_at) IS NOT NEW.sent_at
  OR length(NEW.received_at) <> 24
  OR substr(NEW.received_at, 12, 2) NOT BETWEEN '00' AND '23'
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.received_at) IS NOT NEW.received_at
  OR (NEW.raw_message_blob_hash IS NOT NULL AND length(NEW.raw_message_blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored message');
END;

-- statement-breakpoint
CREATE TRIGGER attachments_validate_insert
BEFORE INSERT ON attachments
WHEN length(NEW.id) = 0
  OR length(NEW.message_id) = 0
  OR (NEW.provider_attachment_id IS NOT NULL AND length(NEW.provider_attachment_id) = 0)
  OR length(NEW.media_type) = 0
  OR typeof(NEW.size_bytes) <> 'integer'
  OR NEW.size_bytes < 0
  OR (NEW.blob_hash IS NOT NULL AND length(NEW.blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored attachment');
END;

-- statement-breakpoint
CREATE TRIGGER attachments_validate_update
BEFORE UPDATE ON attachments
WHEN length(NEW.id) = 0
  OR length(NEW.message_id) = 0
  OR (NEW.provider_attachment_id IS NOT NULL AND length(NEW.provider_attachment_id) = 0)
  OR length(NEW.media_type) = 0
  OR typeof(NEW.size_bytes) <> 'integer'
  OR NEW.size_bytes < 0
  OR (NEW.blob_hash IS NOT NULL AND length(NEW.blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored attachment');
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
UPDATE accounts SET id = id;

-- statement-breakpoint
UPDATE threads SET id = id;

-- statement-breakpoint
UPDATE messages SET id = id;

-- statement-breakpoint
UPDATE attachments SET id = id;

-- statement-breakpoint
UPDATE mailboxes SET parent_id = parent_id;
