import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const UtcTimestamp = Schema.String.check(
  Schema.makeFilter((value) => {
    const parsed = DateTime.make(value);
    return Option.isSome(parsed) && DateTime.formatIso(parsed.value) === value
      ? undefined
      : "Expected a canonical UTC timestamp";
  }),
);
export type UtcTimestamp = typeof UtcTimestamp.Type;
