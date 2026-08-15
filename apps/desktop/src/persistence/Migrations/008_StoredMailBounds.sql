CREATE TRIGGER accounts_mosaic_id_bounds_insert
BEFORE INSERT ON accounts
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'account id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER accounts_mosaic_id_bounds_update
BEFORE UPDATE ON accounts
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'account id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER mailboxes_mosaic_id_bounds_insert
BEFORE INSERT ON mailboxes
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'mailbox id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER mailboxes_mosaic_id_bounds_update
BEFORE UPDATE ON mailboxes
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'mailbox id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER threads_mosaic_id_bounds_insert
BEFORE INSERT ON threads
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'thread id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER threads_mosaic_id_bounds_update
BEFORE UPDATE ON threads
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'thread id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER messages_mosaic_id_bounds_insert
BEFORE INSERT ON messages
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'message id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER messages_mosaic_id_bounds_update
BEFORE UPDATE ON messages
WHEN length(NEW.id) > 512
BEGIN
  SELECT RAISE(ABORT, 'message id exceeds the stored Mosaic id limit');
END;

-- statement-breakpoint
CREATE TRIGGER attachments_public_bounds_insert
BEFORE INSERT ON attachments
WHEN length(NEW.id) > 512
  OR NEW.size_bytes > 9007199254740991
BEGIN
  SELECT RAISE(ABORT, 'attachment exceeds a renderer-safe storage bound');
END;

-- statement-breakpoint
CREATE TRIGGER attachments_public_bounds_update
BEFORE UPDATE ON attachments
WHEN length(NEW.id) > 512
  OR NEW.size_bytes > 9007199254740991
BEGIN
  SELECT RAISE(ABORT, 'attachment exceeds a renderer-safe storage bound');
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
UPDATE attachments SET id = id, size_bytes = size_bytes;
