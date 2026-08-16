import * as Schema from "effect/Schema";

export class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  message: Schema.String,
}) {}

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  message: Schema.String,
}) {}
