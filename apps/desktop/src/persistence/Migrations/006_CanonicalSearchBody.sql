DROP TRIGGER messages_search_insert;

-- statement-breakpoint
DROP TRIGGER messages_search_source_body_update;

-- statement-breakpoint
CREATE TRIGGER messages_search_insert
AFTER INSERT ON messages
BEGIN
  INSERT INTO message_search(message_id, subject, sender, recipients, body)
  VALUES (NEW.id, NEW.subject, '', '', NEW.search_body);
END;
