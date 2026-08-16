import * as Schema from "effect/Schema";

export const EmailAddress = Schema.Trim.check(Schema.isMinLength(1)).pipe(
  Schema.brand("EmailAddress"),
);
export type EmailAddress = typeof EmailAddress.Type;

export const Address = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  address: EmailAddress,
});
export type Address = typeof Address.Type;
