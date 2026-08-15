import * as Schema from "effect/Schema";

export class MailRepositoryError extends Schema.TaggedError<MailRepositoryError>()(
  "MailRepositoryError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export class MailEntityNotFound extends Schema.TaggedError<MailEntityNotFound>()(
  "MailEntityNotFound",
  {
    entity: Schema.Literals(["thread"]),
    id: Schema.String,
  },
) {}
