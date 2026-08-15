DROP TRIGGER messages_account_consistency_update;

-- statement-breakpoint
CREATE TRIGGER messages_account_consistency_update
BEFORE UPDATE OF account_id, thread_id ON messages
WHEN NOT EXISTS (
  SELECT 1
  FROM threads
  WHERE threads.id = NEW.thread_id
    AND threads.account_id = NEW.account_id
)
OR EXISTS (
  SELECT 1
  FROM message_mailboxes membership
  JOIN mailboxes ON mailboxes.id = membership.mailbox_id
  WHERE membership.message_id = OLD.id
    AND mailboxes.account_id <> NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message relationships must stay within one account');
END;

-- statement-breakpoint
CREATE UNIQUE INDEX message_addresses_one_from
ON message_addresses(message_id)
WHERE role = 'from';

-- statement-breakpoint
CREATE TRIGGER accounts_validate_insert
BEFORE INSERT ON accounts
WHEN length(NEW.id) = 0
  OR length(NEW.provider_account_id) = 0
  OR length(trim(NEW.email_address)) = 0
  OR NEW.email_address <> trim(NEW.email_address)
  OR length(NEW.created_at) <> 24
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
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
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
BEGIN
  SELECT RAISE(ABORT, 'invalid stored account');
END;

-- statement-breakpoint
CREATE TRIGGER mailboxes_validate_insert
BEFORE INSERT ON mailboxes
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR length(NEW.provider_mailbox_id) = 0
  OR length(NEW.name) = 0
  OR (NEW.parent_id IS NOT NULL AND length(NEW.parent_id) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored mailbox');
END;

-- statement-breakpoint
CREATE TRIGGER mailboxes_validate_update
BEFORE UPDATE ON mailboxes
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR length(NEW.provider_mailbox_id) = 0
  OR length(NEW.name) = 0
  OR (NEW.parent_id IS NOT NULL AND length(NEW.parent_id) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored mailbox');
END;

-- statement-breakpoint
CREATE TRIGGER threads_validate_insert
BEFORE INSERT ON threads
WHEN length(NEW.id) = 0
  OR length(NEW.account_id) = 0
  OR (NEW.provider_thread_id IS NOT NULL AND length(NEW.provider_thread_id) = 0)
  OR length(NEW.created_at) <> 24
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
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
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR length(NEW.updated_at) <> 24
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
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.sent_at) IS NOT NEW.sent_at
  OR length(NEW.received_at) <> 24
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
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.sent_at) IS NOT NEW.sent_at
  OR length(NEW.received_at) <> 24
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.received_at) IS NOT NEW.received_at
  OR (NEW.raw_message_blob_hash IS NOT NULL AND length(NEW.raw_message_blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored message');
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_validate_insert
BEFORE INSERT ON message_addresses
WHEN length(NEW.message_id) = 0
  OR NEW.position < 0
  OR length(trim(NEW.address)) = 0
  OR NEW.address <> trim(NEW.address)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored message address');
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_validate_update
BEFORE UPDATE ON message_addresses
WHEN length(NEW.message_id) = 0
  OR NEW.position < 0
  OR length(trim(NEW.address)) = 0
  OR NEW.address <> trim(NEW.address)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored message address');
END;

-- statement-breakpoint
CREATE TRIGGER attachments_validate_insert
BEFORE INSERT ON attachments
WHEN length(NEW.id) = 0
  OR length(NEW.message_id) = 0
  OR (NEW.provider_attachment_id IS NOT NULL AND length(NEW.provider_attachment_id) = 0)
  OR length(NEW.media_type) = 0
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
  OR (NEW.blob_hash IS NOT NULL AND length(NEW.blob_hash) = 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid stored attachment');
END;

-- statement-breakpoint
UPDATE accounts SET id = id;

-- statement-breakpoint
UPDATE mailboxes SET id = id;

-- statement-breakpoint
UPDATE threads SET id = id;

-- statement-breakpoint
UPDATE messages SET id = id;

-- statement-breakpoint
UPDATE message_addresses SET message_id = message_id;

-- statement-breakpoint
UPDATE attachments SET id = id;
