import * as Effect from "effect/Effect";

import { ThreadSearchRepository } from "../../persistence/Services/ThreadSearch.ts";
import { toBackendMailError } from "./Errors.ts";

export const SearchMail = Effect.fn("Backend.SearchMail")(function* (input) {
  const repository = yield* ThreadSearchRepository;
  return yield* repository.search(input).pipe(Effect.mapError(toBackendMailError));
});
