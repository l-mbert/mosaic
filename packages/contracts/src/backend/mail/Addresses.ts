import * as Schema from "effect/Schema";

export const EmailAddress = Schema.Trim.check(Schema.isMinLength(1));
export type EmailAddress = typeof EmailAddress.Type;

export const MailAddress = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  address: EmailAddress,
});
export type MailAddress = typeof MailAddress.Type;
