import * as Schema from "effect/Schema";

export class BackendMailError extends Schema.TaggedError<BackendMailError>()("BackendMailError", {
  reason: Schema.Literals(["not-found", "storage"]),
  message: Schema.String,
}) {}
