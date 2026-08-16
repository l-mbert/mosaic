import {
  Attachment,
  Message,
  Thread,
  type ThreadScope,
  ThreadId,
  ThreadPage,
  type ThreadPageCursor,
} from "@mosaic/contracts/backend/mail";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { MailEntityNotFound, MailRepositoryError } from "../Errors.ts";

export const UntrustedHtml = Schema.String.pipe(Schema.brand("UntrustedHtml"));
export type UntrustedHtml = typeof UntrustedHtml.Type;

export const ThreadingKind = Schema.Literals(["provider", "headers", "singleton"]);
export type ThreadingKind = typeof ThreadingKind.Type;

export const StoredAttachment = Schema.Struct({
  ...Attachment.fields,
  providerAttachmentId: Schema.NullOr(Schema.NonEmptyString),
  blobHash: Schema.NullOr(Schema.NonEmptyString),
});
export type StoredAttachment = typeof StoredAttachment.Type;

export const StoredMailMessage = Schema.Struct({
  ...Message.fields,
  providerMessageId: Schema.NonEmptyString,
  body: Schema.Struct({
    text: Schema.NullOr(Schema.String),
    html: Schema.NullOr(UntrustedHtml),
  }),
  rawMessageBlobHash: Schema.NullOr(Schema.NonEmptyString),
  attachments: Schema.Array(StoredAttachment),
});
export type StoredMailMessage = typeof StoredMailMessage.Type;

export const StoredThread = Schema.Struct({
  ...Thread.fields,
  providerThreadId: Schema.NullOr(Schema.NonEmptyString),
  threadingKind: ThreadingKind,
});
export type StoredThread = typeof StoredThread.Type;

export const StoredThreadDetail = Schema.Struct({
  thread: StoredThread,
  messages: Schema.Array(StoredMailMessage),
});
export type StoredThreadDetail = typeof StoredThreadDetail.Type;

export interface QueryThreadsInput {
  readonly scope: ThreadScope;
  readonly limit: number;
  readonly cursor: ThreadPageCursor | null;
}

export interface ThreadRepositoryService {
  readonly query: (input: QueryThreadsInput) => Effect.Effect<ThreadPage, MailRepositoryError>;
  readonly read: (
    threadId: ThreadId,
  ) => Effect.Effect<StoredThreadDetail, MailRepositoryError | MailEntityNotFound>;
}

export class ThreadRepository extends Context.Service<ThreadRepository, ThreadRepositoryService>()(
  "mosaic/desktop/persistence/Services/Threads/ThreadRepository",
) {}
