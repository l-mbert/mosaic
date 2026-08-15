import * as Schema from "effect/Schema";

export const MAX_PAGE_SIZE = 100;

export const PageLimit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_PAGE_SIZE }));
