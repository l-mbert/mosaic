ALTER TABLE messages ADD COLUMN search_body TEXT NOT NULL DEFAULT '';

-- statement-breakpoint
UPDATE messages
SET search_body = CASE
  WHEN length(trim(COALESCE(text_body, ''))) > 0 THEN text_body
  ELSE COALESCE(html_body, '')
END;

-- statement-breakpoint
DROP TABLE message_fts;

-- statement-breakpoint
CREATE TABLE message_search (
  message_id TEXT NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipients TEXT NOT NULL,
  body TEXT NOT NULL
);

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
        AND addresses.role IN ('to', 'cc', 'bcc')
      ORDER BY
        CASE addresses.role WHEN 'to' THEN 0 WHEN 'cc' THEN 1 ELSE 2 END,
        addresses.position
    )
  ), '') AS recipients
FROM messages;

-- statement-breakpoint
CREATE VIRTUAL TABLE message_fts USING fts5(
  subject,
  sender,
  recipients,
  body,
  content = 'message_search',
  content_rowid = 'rowid',
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3 4'
);

-- statement-breakpoint
CREATE TRIGGER message_search_fts_insert
AFTER INSERT ON message_search
BEGIN
  INSERT INTO message_fts(rowid, subject, sender, recipients, body)
  VALUES (NEW.rowid, NEW.subject, NEW.sender, NEW.recipients, NEW.body);
END;

-- statement-breakpoint
CREATE TRIGGER message_search_fts_delete
AFTER DELETE ON message_search
BEGIN
  INSERT INTO message_fts(message_fts, rowid, subject, sender, recipients, body)
  VALUES ('delete', OLD.rowid, OLD.subject, OLD.sender, OLD.recipients, OLD.body);
END;

-- statement-breakpoint
CREATE TRIGGER message_search_fts_update
AFTER UPDATE ON message_search
BEGIN
  INSERT INTO message_fts(message_fts, rowid, subject, sender, recipients, body)
  VALUES ('delete', OLD.rowid, OLD.subject, OLD.sender, OLD.recipients, OLD.body);
  INSERT INTO message_fts(rowid, subject, sender, recipients, body)
  VALUES (NEW.rowid, NEW.subject, NEW.sender, NEW.recipients, NEW.body);
END;

-- statement-breakpoint
CREATE TRIGGER messages_search_insert
AFTER INSERT ON messages
BEGIN
  INSERT INTO message_search(message_id, subject, sender, recipients, body)
  VALUES (
    NEW.id,
    NEW.subject,
    '',
    '',
    CASE
      WHEN length(trim(NEW.search_body)) > 0 THEN NEW.search_body
      WHEN length(trim(COALESCE(NEW.text_body, ''))) > 0 THEN NEW.text_body
      ELSE COALESCE(NEW.html_body, '')
    END
  );
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
CREATE TRIGGER messages_search_source_body_update
AFTER UPDATE OF text_body, html_body ON messages
WHEN NEW.search_body IS OLD.search_body
BEGIN
  UPDATE message_search
  SET body = CASE
    WHEN length(trim(COALESCE(NEW.text_body, ''))) > 0 THEN NEW.text_body
    ELSE COALESCE(NEW.html_body, '')
  END
  WHERE message_id = OLD.id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_insert
AFTER INSERT ON message_addresses
BEGIN
  UPDATE message_search
  SET sender = (
        SELECT sender FROM message_search_addresses WHERE message_id = NEW.message_id
      ),
      recipients = (
        SELECT recipients FROM message_search_addresses WHERE message_id = NEW.message_id
      )
  WHERE message_id = NEW.message_id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_delete
AFTER DELETE ON message_addresses
BEGIN
  UPDATE message_search
  SET sender = COALESCE((
        SELECT sender FROM message_search_addresses WHERE message_id = OLD.message_id
      ), ''),
      recipients = COALESCE((
        SELECT recipients FROM message_search_addresses WHERE message_id = OLD.message_id
      ), '')
  WHERE message_id = OLD.message_id;
END;

-- statement-breakpoint
CREATE TRIGGER message_addresses_search_update
AFTER UPDATE ON message_addresses
BEGIN
  UPDATE message_search
  SET sender = COALESCE((
        SELECT sender FROM message_search_addresses WHERE message_id = OLD.message_id
      ), ''),
      recipients = COALESCE((
        SELECT recipients FROM message_search_addresses WHERE message_id = OLD.message_id
      ), '')
  WHERE message_id = OLD.message_id;

  UPDATE message_search
  SET sender = (
        SELECT sender FROM message_search_addresses WHERE message_id = NEW.message_id
      ),
      recipients = (
        SELECT recipients FROM message_search_addresses WHERE message_id = NEW.message_id
      )
  WHERE message_id = NEW.message_id;
END;

-- statement-breakpoint
INSERT INTO message_search(message_id, subject, sender, recipients, body)
SELECT
  messages.id,
  messages.subject,
  message_search_addresses.sender,
  message_search_addresses.recipients,
  messages.search_body
FROM messages
JOIN message_search_addresses ON message_search_addresses.message_id = messages.id;
