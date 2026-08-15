CREATE VIEW thread_summaries AS
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
