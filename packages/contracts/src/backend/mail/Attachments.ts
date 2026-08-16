import * as Schema from "effect/Schema";

import { AttachmentId, MessageId } from "./Ids.ts";

export const AttachmentDisposition = Schema.Literals(["attachment", "inline"]);
export type AttachmentDisposition = typeof AttachmentDisposition.Type;

export const Attachment = Schema.Struct({
  id: AttachmentId,
  messageId: MessageId,
  filename: Schema.NullOr(Schema.String),
  mediaType: Schema.NonEmptyString,
  sizeBytes: Schema.Natural,
  contentId: Schema.NullOr(Schema.String),
  disposition: AttachmentDisposition,
});
export type Attachment = typeof Attachment.Type;
