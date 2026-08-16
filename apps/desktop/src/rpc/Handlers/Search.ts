import { StorageError } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";

import { ThreadSearchRepository } from "../../persistence/Services/ThreadSearch.ts";

export const SearchThreads = Effect.fn("Backend.SearchThreads")(function* (input) {
  const repository = yield* ThreadSearchRepository;
  return yield* repository.search(input).pipe(
    Effect.mapError(
      () =>
        new StorageError({
          message: "The local mail store could not complete the request.",
        }),
    ),
  );
});
