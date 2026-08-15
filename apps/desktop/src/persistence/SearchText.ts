import sanitizeHtml from "sanitize-html";

interface MessageBody {
  readonly text: string | null;
  readonly html: string | null;
}

export function toSearchableText(body: MessageBody): string {
  const source =
    body.text !== null && body.text.trim().length > 0
      ? body.text
      : body.html === null
        ? ""
        : sanitizeHtml(body.html, { allowedTags: [], allowedAttributes: {} });

  return source.replace(/\s+/gu, " ").trim();
}
