CREATE TRIGGER messages_account_consistency_insert
BEFORE INSERT ON messages
WHEN NOT EXISTS (
  SELECT 1
  FROM threads
  WHERE threads.id = NEW.thread_id
    AND threads.account_id = NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message and thread must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER messages_account_consistency_update
BEFORE UPDATE OF account_id, thread_id ON messages
WHEN NOT EXISTS (
  SELECT 1
  FROM threads
  WHERE threads.id = NEW.thread_id
    AND threads.account_id = NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'message and thread must belong to the same account');
END;

-- statement-breakpoint
CREATE TRIGGER threads_account_consistency_update
BEFORE UPDATE OF account_id ON threads
WHEN EXISTS (
  SELECT 1
  FROM messages
  WHERE messages.thread_id = OLD.id
    AND messages.account_id <> NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'thread and messages must belong to the same account');
END;

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
  SELECT RAISE(ABORT, 'mailbox relationships must stay within one account');
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
UPDATE messages SET account_id = account_id;

-- statement-breakpoint
UPDATE threads SET account_id = account_id;

-- statement-breakpoint
UPDATE mailboxes SET account_id = account_id;

-- statement-breakpoint
UPDATE message_mailboxes SET message_id = message_id;
