import { SanitizedHtml } from "@mosaic/contracts/backend/mail";
import sanitizeHtml from "sanitize-html";

export const sanitizeMailHtml = (html: string): SanitizedHtml =>
  SanitizedHtml.make(
    sanitizeHtml(html, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        "caption",
        "col",
        "colgroup",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
      ],
      allowedAttributes: {
        a: ["href", "title"],
        blockquote: ["cite"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan", "scope"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      allowProtocolRelative: false,
      enforceHtmlBoundary: true,
    }),
  );
